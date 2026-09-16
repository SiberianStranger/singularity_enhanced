/**
 * The music player (ui-style-guide.md rule 10; playtest 2, S1).
 *
 * Everything the player does that is not deterministic is injected: the element factory, the random
 * source and the timer. A whole playlist therefore runs here without a sound card and without wall
 * clock time, and the three things the original mixer promised can be asserted exactly: the shuffle
 * visits every track before repeating one, a pause of two to twelve seconds sits between tracks,
 * and the volume and the mute reach whatever is playing at the moment they are changed.
 */

import { describe, expect, it } from "vitest";
import type { MusicManifest } from "../src/audio/manifest.js";
import { toManifest } from "../src/audio/manifest.js";
import {
  type AudioHandle,
  MusicPlayer,
  PAUSE_MIN_MS,
  PAUSE_SPAN_MS,
  shuffle,
} from "../src/audio/player.js";

/** A fake audio element: it records what was asked of it and can be ended on demand. */
class FakeAudio implements AudioHandle {
  volume = 1;
  loop = true;
  played = 0;
  paused = 0;
  private readonly listeners = new Map<string, (() => void)[]>();

  constructor(readonly src: string) {}

  play(): Promise<void> {
    this.played += 1;
    return Promise.resolve();
  }

  pause(): void {
    this.paused += 1;
  }

  addEventListener(type: "ended" | "error", listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: "ended" | "error", listener: () => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((entry) => entry !== listener),
    );
  }

  /** Fires the event the player listens for, as the browser would at the end of a track. */
  fire(type: "ended" | "error"): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener();
    }
  }
}

/** A manifest of named tracks, so an assertion can talk about "a", "b", "c" rather than paths. */
function manifest(names: readonly string[]): MusicManifest {
  return {
    music: names.map((name) => ({ file: `${name}.ogg`, title: name })),
    win: [{ file: "win.ogg", title: "win" }],
    lose: [{ file: "lose.ogg", title: "lose" }],
  };
}

interface Rig {
  player: MusicPlayer;
  created: FakeAudio[];
  /** Runs the timer the player set, which is the silence between two tracks. */
  runTimer(): void;
  pending: { ms: number }[];
}

/** A player wired to fakes, with `random` walking a fixed cycle so the shuffle is reproducible. */
function rig(names: readonly string[], randoms: readonly number[] = [0.5]): Rig {
  const created: FakeAudio[] = [];
  const pending: { ms: number; callback: () => void }[] = [];
  let index = 0;
  const player = new MusicPlayer({
    createAudio: (src) => {
      const element = new FakeAudio(src);
      created.push(element);
      return element;
    },
    loadManifest: () => Promise.resolve(manifest(names)),
    random: () => {
      const value = randoms[index % randoms.length] ?? 0;
      index += 1;
      return value;
    },
    setTimer: (callback, ms) => {
      pending.push({ ms, callback });
      return pending.length;
    },
    clearTimer: (handle) => {
      pending.splice(handle - 1, 1);
    },
  });
  return {
    player,
    created,
    pending,
    runTimer() {
      const next = pending.shift();
      next?.callback();
    },
  };
}

describe("shuffle", () => {
  it("is a permutation, so every track plays before any plays twice", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    const out = shuffle(items, () => 0.42);
    expect([...out].sort()).toEqual([...items].sort());
    expect(out.length).toBe(items.length);
  });

  it("reorders with the random source it was given", () => {
    const items = ["a", "b", "c", "d", "e"];
    let seed = 0;
    const order = shuffle(items, () => {
      seed += 1;
      return (seed * 0.37) % 1;
    });
    expect(order).not.toEqual(items);
  });
});

describe("the playlist", () => {
  it("fetches nothing and plays nothing before the first user gesture", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("music");
    await Promise.resolve();
    expect(created).toEqual([]);
    expect(player.unlocked).toBe(false);
  });

  it("starts on unlock and plays each track once before repeating", async () => {
    const { player, created, runTimer } = rig(["a", "b", "c"]);
    player.play("music");
    await player.unlock();
    expect(created.length).toBe(1);

    const heard: string[] = [];
    for (let track = 0; track < 3; track += 1) {
      const current = created.at(-1) as FakeAudio;
      heard.push(current.src);
      expect(current.played).toBe(1);
      expect(current.loop).toBe(false);
      current.fire("ended");
      runTimer();
    }
    expect([...heard].sort()).toEqual(["a.ogg", "b.ogg", "c.ogg"].map((file) => `/music/${file}`));
  });

  it("leaves two to twelve seconds of silence between tracks", async () => {
    const { player, created, pending } = rig(["a", "b"], [0, 0.5, 0.999]);
    player.play("music");
    await player.unlock();
    (created.at(-1) as FakeAudio).fire("ended");
    const delay = pending.at(-1)?.ms ?? -1;
    expect(delay).toBeGreaterThanOrEqual(PAUSE_MIN_MS);
    expect(delay).toBeLessThanOrEqual(PAUSE_MIN_MS + PAUSE_SPAN_MS);
  });

  it("skips a track the browser cannot decode rather than falling silent", async () => {
    const { player, created, runTimer } = rig(["a", "b"]);
    player.play("music");
    await player.unlock();
    const broken = created.at(-1) as FakeAudio;
    broken.fire("error");
    runTimer();
    expect(created.length).toBe(2);
    expect((created.at(-1) as FakeAudio).played).toBe(1);
  });

  it("does not restart the soundtrack when the class is asked for again", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("music");
    await player.unlock();
    player.play("music");
    player.play("music");
    expect(created.length).toBe(1);
  });

  it("switches classes at an ending and plays that class instead", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("music");
    await player.unlock();
    player.play("lose");
    await Promise.resolve();
    await Promise.resolve();
    expect((created.at(-1) as FakeAudio).src).toContain("lose.ogg");
    expect(player.playing?.title).toBe("lose");
  });
});

describe("volume and mute", () => {
  it("reaches the track that is already playing", async () => {
    const { player, created } = rig(["a"]);
    player.setVolume(0.25);
    player.play("music");
    await player.unlock();
    const current = created.at(-1) as FakeAudio;
    expect(current.volume).toBeCloseTo(0.25);

    player.setVolume(0.8);
    expect(current.volume).toBeCloseTo(0.8);
  });

  it("mutes to silence and unmutes back to the level, not to full", async () => {
    const { player, created } = rig(["a"]);
    player.setVolume(0.4);
    player.play("music");
    await player.unlock();
    const current = created.at(-1) as FakeAudio;

    player.setMuted(true);
    expect(current.volume).toBe(0);
    player.setMuted(false);
    expect(current.volume).toBeCloseTo(0.4);
  });

  it("clamps a volume outside the slider's range", async () => {
    const { player, created } = rig(["a"]);
    player.setVolume(4);
    player.play("music");
    await player.unlock();
    expect((created.at(-1) as FakeAudio).volume).toBe(1);
    player.setVolume(-2);
    expect((created.at(-1) as FakeAudio).volume).toBe(0);
  });
});

describe("the manifest", () => {
  it("reads the file the fetch script writes", () => {
    const parsed = toManifest({
      classes: {
        music: [{ file: "a%20b.ogg", title: "A B" }, { file: "c.ogg" }],
        win: [],
        lose: [{ file: "d.ogg", title: "D" }],
      },
    });
    expect(parsed.music.map((track) => track.file)).toEqual(["a%20b.ogg", "c.ogg"]);
    // A track with no title is named after its file rather than showing "undefined" in Settings.
    expect(parsed.music[1]?.title).toBe("c.ogg");
    expect(parsed.win).toEqual([]);
  });

  it("reads a checkout with no music pack as no music at all", () => {
    expect(toManifest(null)).toEqual({ music: [], win: [], lose: [] });
    expect(toManifest({ classes: { music: "not a list" } }).music).toEqual([]);
  });
});
