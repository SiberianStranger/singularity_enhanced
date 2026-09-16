/**
 * The music player (ui-style-guide.md rule 10, playtest 2, S1).
 *
 * It mirrors the original game's mixer: the tracks of the `music/` class play one after another in
 * shuffled order with a pause between them, and the endings play the `win/` and `lose/` classes.
 * The differences are the ones the web forces: nothing is loaded until the player asks for a track
 * (so the first paint never waits on 107 MB of Ogg Vorbis), and nothing plays at all until the
 * first user gesture, because browsers refuse to start audio before one.
 *
 * Everything that is not deterministic is injected: the element factory, the random source and the
 * timer. A test can therefore run a whole playlist without a sound card and assert the order.
 */

import {
  EMPTY_MANIFEST,
  loadManifest,
  type MusicClass,
  type MusicManifest,
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

/** Pause between tracks, as in the original mixer: two to twelve seconds. */
export const PAUSE_MIN_MS = 2000;
export const PAUSE_SPAN_MS = 10_000;

function defaultCreateAudio(src: string): AudioHandle {
  const element = new Audio(src);
  element.preload = "none";
  return element;
}

/**
 * Fisher-Yates over a copy, with the injected random source.
 *
 * A shuffled queue rather than the original's "pick one at random every time": with seventeen
 * tracks, independent draws repeat one often enough to be noticed, and the pack is the soundtrack
 * of a long game.
 */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

export class MusicPlayer {
  private manifest: MusicManifest = EMPTY_MANIFEST;
  private loaded = false;
  private loading: Promise<MusicManifest> | null = null;
  private queue: Track[] = [];
  private current: AudioHandle | null = null;
  private currentTrack: Track | null = null;
  private timer: number | null = null;
  private klass: MusicClass | null = null;
  private started = false;
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

  /** True once a user gesture has unlocked audio; before that nothing is fetched or played. */
  get unlocked(): boolean {
    return this.started;
  }

  /** What is playing right now, for the Settings panel and for tests. */
  get playing(): Track | null {
    return this.currentTrack;
  }

  get tracksAvailable(): number {
    return this.manifest.music.length + this.manifest.win.length + this.manifest.lose.length;
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
   * The first user gesture: from here on the player may fetch the manifest and start a track. It is
   * called once from a pointer or key handler, which is what browsers count as consent.
   */
  async unlock(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    await this.ensureManifest();
    if (this.klass !== null) {
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
   * Switches to a class and starts it. Calling it again with the class already playing does
   * nothing, so a re-render cannot restart the soundtrack.
   */
  play(klass: MusicClass): void {
    if (this.klass === klass && (this.current !== null || this.timer !== null)) {
      return;
    }
    this.klass = klass;
    this.queue = [];
    this.stopCurrent();
    if (!this.started) {
      return;
    }
    void this.ensureManifest().then(() => {
      if (this.klass === klass) {
        this.next(0);
      }
    });
  }

  /** Stops the music and forgets the class; the next `play` starts from a fresh shuffle. */
  stop(): void {
    this.klass = null;
    this.queue = [];
    this.stopCurrent();
  }

  private stopCurrent(): void {
    if (this.timer !== null) {
      this.stopTimer(this.timer);
      this.timer = null;
    }
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

  private take(): Track | null {
    const klass = this.klass;
    if (klass === null) {
      return null;
    }
    const tracks = this.manifest[klass];
    if (tracks.length === 0) {
      return null;
    }
    if (this.queue.length === 0) {
      this.queue = shuffle(tracks, this.random);
      // Two cycles in a row must not start with the track that just ended.
      if (this.queue.length > 1 && this.queue[0]?.file === this.currentTrack?.file) {
        const first = this.queue.shift();
        if (first !== undefined) {
          this.queue.push(first);
        }
      }
    }
    return this.queue.shift() ?? null;
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
        if (this.current === element) {
          this.current = null;
          this.currentTrack = null;
          this.next(this.pause());
        }
      };
      element.addEventListener("ended", onDone);
      // A track the browser cannot decode is skipped rather than ending the soundtrack.
      element.addEventListener("error", onDone);
      this.current = element;
      this.currentTrack = track;
      void Promise.resolve(element.play()).catch(() => onDone());
    };
    if (delay <= 0) {
      start();
    } else {
      this.timer = this.startTimer(start, delay);
    }
  }

  dispose(): void {
    this.stop();
  }
}
