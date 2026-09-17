/**
 * The music player (ui-style-guide.md rule 10; playtest 2 S1; playtest 6 X14 and X15).
 *
 * The original's mixer drew a track at random from a folder every time one ended, with a pause of
 * two to twelve seconds between them, and did that for the menu and for the game alike. This game
 * keeps the pause and drops the randomness: the menu has one melody of its own, the model's first
 * two messages have one quiet melody of their own, and a run plays the rest in a fixed order. Which
 * track has which role is in the manifest, not here, so changing the soundtrack is changing data.
 *
 * What the web adds is a start-up problem the original never had (X15). Nothing may *play* before
 * a user gesture, but everything may *load*, and the version before this one did neither until the
 * gesture: the manifest was fetched on the first click, the first 3 MB Ogg started downloading
 * after that, and the menu stayed silent for ten seconds or more. So the manifest is fetched at
 * page load, the menu track's element is created at page load with `preload="auto"` and buffers
 * while the player reads the menu, and playback is attempted once straight away: a browser that
 * allows it (one the player has used before) starts immediately, and one that does not hands back
 * `NotAllowedError`, which is not an error but "wait for the gesture". On the gesture the buffered
 * element is played with no delay, because the original's pause is between tracks, never before
 * the first one.
 *
 * Everything that is not deterministic is injected: the element factory, the random source and the
 * timer. A test can therefore run a whole playlist without a sound card and assert the order.
 */

import {
  EMPTY_MANIFEST,
  loadManifest,
  type MusicManifest,
  type MusicRole,
  musicBase,
  type Track,
} from "./manifest.js";

/** The part of `HTMLAudioElement` the player uses; a test passes a stub with the same shape. */
export interface AudioHandle {
  volume: number;
  loop: boolean;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: "ended" | "error", listener: () => void): void;
  removeEventListener(type: "ended" | "error", listener: () => void): void;
}

export interface MusicPlayerOptions {
  createAudio?(src: string): AudioHandle;
  loadManifest?(): Promise<MusicManifest>;
  random?(): number;
  setTimer?(callback: () => void, ms: number): number;
  clearTimer?(handle: number): void;
}

/** Pause between tracks, as in the original mixer: two to twelve seconds. Never before the first. */
export const PAUSE_MIN_MS = 2000;
export const PAUSE_SPAN_MS = 10_000;

function defaultCreateAudio(src: string): AudioHandle {
  const element = new Audio(src);
  /*
   * X15: the browser starts buffering as soon as the element exists, which is allowed before a
   * gesture even though playing is not. `preload="none"` meant the first track only began
   * downloading after the player clicked, and 3 to 5 MB of Ogg Vorbis is several seconds of
   * silence on a normal connection.
   */
  element.preload = "auto";
  return element;
}

/** Whether a rejected `play()` means "not yet, no gesture" rather than "this track is broken". */
export function autoplayBlocked(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  // Chrome and Firefox reject with NotAllowedError; Safari has used AbortError for the same thing.
  return name === "NotAllowedError" || name === "AbortError" || name === "NotSupportedError";
}

export class MusicPlayer {
  private manifest: MusicManifest = EMPTY_MANIFEST;
  private loaded = false;
  private loading: Promise<MusicManifest> | null = null;
  /** How far through the current role's list the player is; the order never changes. */
  private index = 0;
  private current: AudioHandle | null = null;
  private currentTrack: Track | null = null;
  private timer: number | null = null;
  private role: MusicRole | null = null;
  private started = false;
  /** An element that exists and has buffered, but that the browser refused to play without one. */
  private waitingForGesture = false;
  private volume = 0.5;
  private muted = false;

  private readonly createAudio: (src: string) => AudioHandle;
  private readonly load: () => Promise<MusicManifest>;
  private readonly random: () => number;
  private readonly startTimer: (callback: () => void, ms: number) => number;
  private readonly stopTimer: (handle: number) => void;

  constructor(options: MusicPlayerOptions = {}) {
    this.createAudio = options.createAudio ?? defaultCreateAudio;
    this.load = options.loadManifest ?? (() => loadManifest());
    this.random = options.random ?? Math.random;
    this.startTimer =
      options.setTimer ?? ((callback, ms) => setTimeout(callback, ms) as unknown as number);
    this.stopTimer = options.clearTimer ?? ((handle) => clearTimeout(handle));
  }

  /** True once something has actually played; before that the player is still asking permission. */
  get unlocked(): boolean {
    return this.started;
  }

  /** True while a track is loaded and waiting for the first gesture to be allowed to sound. */
  get pendingGesture(): boolean {
    return this.waitingForGesture;
  }

  /** True once the manifest has been read, whether or not it found any tracks. */
  get ready(): boolean {
    return this.loaded;
  }

  /** What is playing right now, for the Settings panel and for tests. */
  get playing(): Track | null {
    return this.currentTrack;
  }

  get tracksAvailable(): number {
    const { menu, opening, game, win, lose } = this.manifest;
    return new Set([...menu, ...opening, ...game, ...win, ...lose].map((track) => track.file)).size;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.current !== null) {
      this.current.volume = this.effectiveVolume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.current !== null) {
      this.current.volume = this.effectiveVolume();
    }
  }

  private effectiveVolume(): number {
    return this.muted ? 0 : this.volume;
  }

  /**
   * Page load: fetch the manifest (a few hundred bytes) and, if a role has already been asked for,
   * create its first track and try to play it. The try is what makes music instant for a returning
   * player, whose browser has already learned that this site may sound.
   */
  async prime(): Promise<void> {
    await this.ensureManifest();
    if (this.role !== null && this.current === null && this.timer === null) {
      this.next(0);
    }
  }

  /**
   * The first user gesture. Whatever was buffered and refused now plays, with no pause in front of
   * it; if nothing was buffered (no role yet, or no manifest yet) the current role starts.
   */
  async unlock(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    if (this.waitingForGesture && this.current !== null) {
      this.waitingForGesture = false;
      const element = this.current;
      void Promise.resolve(element.play()).then(undefined, () => this.skip(element));
      return;
    }
    await this.ensureManifest();
    if (this.role !== null && this.current === null) {
      this.next(0);
    }
  }

  private async ensureManifest(): Promise<MusicManifest> {
    if (this.loaded) {
      return this.manifest;
    }
    this.loading ??= this.load();
    this.manifest = await this.loading;
    this.loaded = true;
    return this.manifest;
  }

  /**
   * Switches to a role and starts it from the top of that role's list. Calling it again with the
   * role already playing does nothing, so a re-render cannot restart the soundtrack; leaving the
   * role and coming back to it does restart it, which is how the menu's melody begins again every
   * time the player reaches the menu.
   */
  play(role: MusicRole): void {
    if (this.role === role && (this.current !== null || this.timer !== null)) {
      return;
    }
    this.role = role;
    this.index = 0;
    this.stopCurrent();
    void this.ensureManifest().then(() => {
      if (this.role === role && this.current === null) {
        this.next(0);
      }
    });
  }

  /** Stops the music and forgets the role; the next `play` starts from the top of its list. */
  stop(): void {
    this.role = null;
    this.index = 0;
    this.stopCurrent();
  }

  private stopCurrent(): void {
    if (this.timer !== null) {
      this.stopTimer(this.timer);
      this.timer = null;
    }
    this.waitingForGesture = false;
    if (this.current !== null) {
      this.current.pause();
      this.current = null;
      this.currentTrack = null;
    }
  }

  /** The pause between two tracks, in milliseconds. */
  private pause(): number {
    return PAUSE_MIN_MS + Math.floor(this.random() * PAUSE_SPAN_MS);
  }

  /**
   * The next track of the current role, in the manifest's order, wrapping round at the end.
   *
   * The menu and the opening are one-track lists, so wrapping is that track again after the usual
   * pause: the menu is a place a player can sit in for a long time, and silence after four minutes
   * would read as something broken.
   */
  private take(): Track | null {
    const role = this.role;
    if (role === null) {
      return null;
    }
    const tracks = this.manifest[role];
    if (tracks.length === 0) {
      return null;
    }
    const track = tracks[this.index % tracks.length];
    this.index = (this.index + 1) % tracks.length;
    return track ?? null;
  }

  /** Starts the next track after `delay` milliseconds of silence. */
  private next(delay: number): void {
    if (this.timer !== null) {
      this.stopTimer(this.timer);
      this.timer = null;
    }
    const start = (): void => {
      this.timer = null;
      const track = this.take();
      if (track === null) {
        return;
      }
      const element = this.createAudio(`${musicBase()}${track.file}`);
      element.volume = this.effectiveVolume();
      element.loop = false;
      const onDone = (): void => {
        element.removeEventListener("ended", onDone);
        element.removeEventListener("error", onDone);
        this.skip(element);
      };
      element.addEventListener("ended", onDone);
      // A track the browser cannot decode is skipped rather than ending the soundtrack.
      element.addEventListener("error", onDone);
      this.current = element;
      this.currentTrack = track;
      void Promise.resolve(element.play()).then(
        () => {
          this.started = true;
          this.waitingForGesture = false;
        },
        (error: unknown) => {
          if (autoplayBlocked(error) && !this.started) {
            // Not a broken track: the browser wants a gesture first. The element stays, and goes
            // on buffering, so the gesture starts it without waiting for a download.
            this.waitingForGesture = true;
            return;
          }
          onDone();
        },
      );
    };
    if (delay <= 0) {
      start();
    } else {
      this.timer = this.startTimer(start, delay);
    }
  }

  /** A track ended or failed: move on to the next one after the original's pause. */
  private skip(element: AudioHandle): void {
    if (this.current !== element) {
      return;
    }
    this.current = null;
    this.currentTrack = null;
    this.waitingForGesture = false;
    this.next(this.pause());
  }

  dispose(): void {
    this.stop();
  }
}
