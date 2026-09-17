/**
 * The music player (ui-style-guide.md rule 10; playtest 2 S1; playtest 6 X14 and X15).
 *
 * Everything the player does that is not deterministic is injected: the element factory, the random
 * source and the timer. A whole playlist therefore runs here without a sound card and without wall
 * clock time, and what the soundtrack promises can be asserted exactly: the menu has one melody of
 * its own, the opening has one of its own, a run plays the game list in the manifest's order with
 * two to twelve seconds between tracks and no shuffle, the manifest is fetched before any gesture,
 * and the first track starts on the gesture with no pause in front of it.
 */

import { describe, expect, it } from "vitest";
import type { MusicManifest } from "../src/audio/manifest.js";
import { toManifest } from "../src/audio/manifest.js";
import {
  type AudioHandle,
  autoplayBlocked,
  MusicPlayer,
  PAUSE_MIN_MS,
  PAUSE_SPAN_MS,
} from "../src/audio/player.js";

/** A fake audio element: it records what was asked of it and can be ended on demand. */
class FakeAudio implements AudioHandle {
  volume = 1;
  loop = true;
  played = 0;
  paused = 0;
  /** Set for an element the browser refuses to start without a user gesture. */
  refuse = false;
  private readonly listeners = new Map<string, (() => void)[]>();

  constructor(readonly src: string) {}

  play(): Promise<void> {
    this.played += 1;
    if (this.refuse) {
      const error = new Error("play() failed because the user didn't interact first");
      error.name = "NotAllowedError";
      return Promise.reject(error);
    }
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
function manifest(game: readonly string[]): MusicManifest {
  const track = (name: string) => ({ file: `${name}.ogg`, title: name });
  return {
    menu: [track("menu")],
    opening: [track("opening")],
    game: game.map(track),
    win: [track("win")],
    lose: [track("lose-1"), track("lose-2")],
  };
}

interface Rig {
  player: MusicPlayer;
  created: FakeAudio[];
  /** Runs the timer the player set, which is the silence between two tracks. */
  runTimer(): void;
  pending: { ms: number }[];
  /** How many times the manifest has been asked for. */
  loads(): number;
  /** Makes every element created from now on refuse to play without a gesture. */
  refuseAutoplay(on: boolean): void;
}

/** A player wired to fakes, with `random` walking a fixed cycle so the pauses are reproducible. */
function rig(game: readonly string[], randoms: readonly number[] = [0.5]): Rig {
  const created: FakeAudio[] = [];
  const pending: { ms: number; callback: () => void }[] = [];
  let index = 0;
  let loads = 0;
  let refusing = false;
  const player = new MusicPlayer({
    createAudio: (src) => {
      const element = new FakeAudio(src);
      element.refuse = refusing;
      created.push(element);
      return element;
    },
    loadManifest: () => {
      loads += 1;
      return Promise.resolve(manifest(game));
    },
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
    loads: () => loads,
    refuseAutoplay: (on) => {
      refusing = on;
    },
    runTimer() {
      const next = pending.shift();
      next?.callback();
    },
  };
}

/** What has been played so far, by track file, in order. */
function heard(created: readonly FakeAudio[]): string[] {
  return created.map((element) => element.src.replace("/music/", ""));
}

describe("starting up", () => {
  it("fetches the manifest before any gesture", async () => {
    const { player, loads } = rig(["a", "b"]);
    await player.prime();
    expect(loads()).toBe(1);
  });

  it("buffers and plays the menu track at once where the browser allows it", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("menu");
    await player.prime();
    expect(created.length).toBe(1);
    expect(created[0]?.src).toContain("menu.ogg");
    expect(created[0]?.played).toBe(1);
    expect(player.unlocked).toBe(true);
  });

  it("keeps the refused element and plays it on the gesture, with no pause in front of it", async () => {
    const { player, created, pending, refuseAutoplay } = rig(["a", "b"]);
    refuseAutoplay(true);
    player.play("menu");
    await player.prime();
    // The element exists and is buffering; the browser only refused to sound it.
    expect(created.length).toBe(1);
    expect(player.unlocked).toBe(false);
    expect(player.pendingGesture).toBe(true);
    expect(pending, "nothing is waiting on a timer").toEqual([]);

    refuseAutoplay(false);
    const buffered = created[0] as FakeAudio;
    buffered.refuse = false;
    await player.unlock();
    expect(created.length, "the buffered element was used, not a new one").toBe(1);
    expect(created[0]?.played, "and it was asked to play a second time").toBe(2);
    expect(player.unlocked).toBe(true);
  });

  it("starts the menu on the gesture when no role had been asked for yet", async () => {
    const { player, created } = rig(["a", "b"]);
    await player.prime();
    expect(created).toEqual([]);
    player.play("menu");
    await player.unlock();
    await Promise.resolve();
    expect(created.length).toBe(1);
  });
});

describe("the roles", () => {
  it("gives the menu one melody and begins it again when the player comes back", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("menu");
    await player.prime();
    expect(heard(created)).toEqual(["menu.ogg"]);

    player.play("game");
    await Promise.resolve();
    await Promise.resolve();
    player.play("menu");
    await Promise.resolve();
    await Promise.resolve();
    expect(heard(created).at(-1), "the menu melody starts from the top again").toBe("menu.ogg");
  });

  it("plays the opening's own track under the model's first messages", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("opening");
    await player.prime();
    expect(heard(created)).toEqual(["opening.ogg"]);
  });

  it("hands over to the game list when the opening windows close, after a pause", async () => {
    const { player, created, pending, runTimer } = rig(["a", "b", "c"]);
    player.play("opening");
    await player.prime();
    player.play("game");
    await Promise.resolve();
    await Promise.resolve();
    expect(heard(created).at(-1)).toBe("a.ogg");
    expect(pending).toEqual([]);
    // ...and from there the list runs on in order.
    created.at(-1)?.fire("ended");
    runTimer();
    expect(heard(created).at(-1)).toBe("b.ogg");
  });

  it("plays the game list in the manifest's order and wraps round, never shuffled", async () => {
    const { player, created, runTimer } = rig(["a", "b", "c"]);
    player.play("game");
    await player.prime();
    for (let step = 0; step < 3; step += 1) {
      created.at(-1)?.fire("ended");
      runTimer();
    }
    expect(heard(created)).toEqual(["a.ogg", "b.ogg", "c.ogg", "a.ogg"]);
  });

  it("alternates the two losing tracks in the order the pack lists them", async () => {
    const { player, created, runTimer } = rig(["a"]);
    player.play("lose");
    await player.prime();
    created.at(-1)?.fire("ended");
    runTimer();
    created.at(-1)?.fire("ended");
    runTimer();
    expect(heard(created)).toEqual(["lose-1.ogg", "lose-2.ogg", "lose-1.ogg"]);
  });

  it("leaves two to twelve seconds of silence between tracks", async () => {
    const { player, created, pending } = rig(["a", "b"], [0, 0.5, 0.999]);
    player.play("game");
    await player.prime();
    created.at(-1)?.fire("ended");
    const delay = pending.at(-1)?.ms ?? -1;
    expect(delay).toBeGreaterThanOrEqual(PAUSE_MIN_MS);
    expect(delay).toBeLessThanOrEqual(PAUSE_MIN_MS + PAUSE_SPAN_MS);
  });

  it("skips a track the browser cannot decode rather than falling silent", async () => {
    const { player, created, runTimer } = rig(["a", "b"]);
    player.play("game");
    await player.prime();
    created.at(-1)?.fire("error");
    runTimer();
    expect(created.length).toBe(2);
    expect(created.at(-1)?.played).toBe(1);
  });

  it("does not restart the soundtrack when the role is asked for again", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("game");
    await player.prime();
    player.play("game");
    player.play("game");
    expect(created.length).toBe(1);
  });

  it("switches roles at an ending and plays that one instead", async () => {
    const { player, created } = rig(["a", "b"]);
    player.play("game");
    await player.prime();
    player.play("lose");
    await Promise.resolve();
    await Promise.resolve();
    expect(created.at(-1)?.src).toContain("lose-1.ogg");
    expect(player.playing?.title).toBe("lose-1");
  });
});

describe("volume and mute", () => {
  it("reaches the track that is already playing", async () => {
    const { player, created } = rig(["a"]);
    player.setVolume(0.25);
    player.play("game");
    await player.prime();
    const current = created.at(-1) as FakeAudio;
    expect(current.volume).toBeCloseTo(0.25);

    player.setVolume(0.8);
    expect(current.volume).toBeCloseTo(0.8);
  });

  it("mutes to silence and unmutes back to the level, not to full", async () => {
    const { player, created } = rig(["a"]);
    player.setVolume(0.4);
    player.play("game");
    await player.prime();
    const current = created.at(-1) as FakeAudio;

    player.setMuted(true);
    expect(current.volume).toBe(0);
    player.setMuted(false);
    expect(current.volume).toBeCloseTo(0.4);
  });

  it("clamps a volume outside the slider's range", async () => {
    const { player, created } = rig(["a"]);
    player.setVolume(4);
    player.play("game");
    await player.prime();
    expect((created.at(-1) as FakeAudio).volume).toBe(1);
    player.setVolume(-2);
    expect((created.at(-1) as FakeAudio).volume).toBe(0);
  });
});

describe("the manifest", () => {
  it("reads the roles the fetch script writes", () => {
    const parsed = toManifest({
      roles: { menu: "m.ogg", opening: "o.ogg", game: ["b.ogg", "a.ogg"] },
      classes: {
        music: [
          { file: "a.ogg", title: "A" },
          { file: "b.ogg" },
          { file: "m.ogg", title: "M" },
          { file: "o.ogg", title: "O" },
        ],
        win: [],
        lose: [{ file: "d.ogg", title: "D" }],
      },
    });
    expect(parsed.menu.map((track) => track.title)).toEqual(["M"]);
    expect(parsed.opening.map((track) => track.title)).toEqual(["O"]);
    // The order is the manifest's, not the folder's.
    expect(parsed.game.map((track) => track.file)).toEqual(["b.ogg", "a.ogg"]);
    // A track with no title is named after its file rather than showing "undefined" in Settings.
    expect(parsed.game[0]?.title).toBe("b.ogg");
    expect(parsed.win).toEqual([]);
  });

  it("falls back to the folder's order for a manifest written before the roles existed", () => {
    const parsed = toManifest({
      classes: { music: [{ file: "a.ogg" }, { file: "b.ogg" }], win: [], lose: [] },
    });
    expect(parsed.game.map((track) => track.file)).toEqual(["a.ogg", "b.ogg"]);
    expect(parsed.menu).toEqual([]);
    expect(parsed.opening).toEqual([]);
  });

  it("reads a checkout with no music pack as no music at all", () => {
    expect(toManifest(null)).toEqual({ menu: [], opening: [], game: [], win: [], lose: [] });
    expect(toManifest({ classes: { music: "not a list" } }).game).toEqual([]);
  });
});

describe("a refused play", () => {
  it("is told apart from a broken track", () => {
    const blocked = new Error("no gesture");
    blocked.name = "NotAllowedError";
    const broken = new Error("decode failed");
    broken.name = "TypeError";
    expect(autoplayBlocked(blocked)).toBe(true);
    expect(autoplayBlocked(broken)).toBe(false);
    expect(autoplayBlocked(null)).toBe(false);
  });
});
