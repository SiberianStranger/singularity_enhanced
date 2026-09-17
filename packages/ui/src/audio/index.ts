/**
 * The client's one music player and one sound bank, and the React glue that drives them
 * (ui-style-guide.md rule 10, playtest 2 S1).
 *
 * The rules browsers impose are the rules the original mixer never had: audio may not start before
 * a user gesture, and 107 MB of Ogg Vorbis must not sit in the way of the first paint. Both are
 * handled here rather than in the components: `useAudioUnlock` listens once for the first pointer
 * or key press anywhere in the document and unlocks both channels, and nothing touches the network
 * until that happens.
 *
 * Which role plays is a function of the screen, so `musicRole` states it once: the menu and the
 * configurator play the menu's own melody, the model's first two messages play the opening's, a
 * run plays the game list in the manifest's order, and an ending switches to `win` or `lose` and
 * stays there (playtest 6, X14).
 */

import { useEffect } from "react";
import { useUiStore } from "../store/uiStore.js";
import type { MusicRole } from "./manifest.js";
import { MusicPlayer } from "./player.js";
import { SoundBank, type SoundName } from "./sfx.js";

export const music = new MusicPlayer();
export const sounds = new SoundBank();

/** Plays an interface sound; safe before the first gesture, where it does nothing. */
export function playSound(name: SoundName): void {
  sounds.play(name);
}

/**
 * Unlocks both channels on the first user gesture and keeps their volumes in step with Settings.
 *
 * Mounted once, from `App`. The listeners are `once`, so after the first press nothing stays
 * attached to the document.
 */
export function useAudioUnlock(): void {
  const audio = useUiStore((state) => state.audio);

  /*
   * Page load, not the gesture (playtest 6, X15): the manifest is fetched and the first track's
   * element is created and left to buffer, and playback is attempted once. A browser that allows
   * it starts there and then; one that does not leaves the buffered element waiting, and the
   * listeners below hand it the gesture it asked for.
   */
  useEffect(() => {
    void music.prime();
  }, []);

  useEffect(() => {
    const unlock = (): void => {
      void music.unlock();
      sounds.unlock();
    };
    const options = { once: true, passive: true } as const;
    document.addEventListener("pointerdown", unlock, options);
    document.addEventListener("keydown", unlock, options);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    music.setVolume(audio.music_volume);
    music.setMuted(audio.music_muted);
    sounds.setVolume(audio.sfx_volume);
    sounds.setMuted(audio.sfx_muted);
  }, [audio]);
}

/**
 * Asks the player for a role while the component is mounted.
 *
 * `MusicPlayer.play` ignores a call for the role already playing, so a re-render cannot restart the
 * soundtrack, and a null role stops it (the ending overlay hands over to `win`/`lose` rather than
 * stopping, so this is only used when there should be silence).
 */
export function useMusicForScreen(role: MusicRole | null): void {
  useEffect(() => {
    if (role === null) {
      music.stop();
      return;
    }
    music.play(role);
  }, [role]);
}

/**
 * What should be playing, from the screen the player is on (playtest 6, X14).
 *
 * The menu and the configurator share one melody: they are the same place, before a run, and the
 * game list would spend itself there. The opening's two windows have their own quiet track, and
 * when they close the game list takes over; an ending replaces whatever was playing. Every reason
 * but `won` is a loss (SYS-10).
 */
export function musicRole(
  screen: "menu" | "configurator" | "game",
  openingUp: boolean,
  ending: string | undefined,
): MusicRole {
  if (ending !== undefined) {
    return ending === "won" ? "win" : "lose";
  }
  if (screen !== "game") {
    return "menu";
  }
  return openingUp ? "opening" : "game";
}
