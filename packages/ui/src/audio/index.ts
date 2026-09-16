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
 * Which class plays is a function of the screen, so `useMusicForScreen` states it once: the menu
 * and the configurator share the `music/` shuffle, a run plays the same shuffle, and an ending
 * switches to `win/` or `lose/` and stays there.
 */

import { useEffect } from "react";
import { useUiStore } from "../store/uiStore.js";
import type { MusicClass } from "./manifest.js";
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

  useEffect(() => {
    const unlock = (): void => {
      void music.unlock();
      sounds.unlock();
    };
    if (music.unlocked) {
      return;
    }
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
 * Asks the player for a class while the component is mounted.
 *
 * `MusicPlayer.play` ignores a call for the class already playing, so a re-render cannot restart
 * the soundtrack, and a null class stops it (the ending overlay hands over to `win`/`lose` rather
 * than stopping, so this is only used when there should be silence).
 */
export function useMusicForScreen(klass: MusicClass | null): void {
  useEffect(() => {
    if (klass === null) {
      music.stop();
      return;
    }
    music.play(klass);
  }, [klass]);
}

/** The class an ending reason belongs to; every reason but `won` is a loss (SYS-10). */
export function endingClass(reason: string | undefined): MusicClass {
  return reason === "won" ? "win" : "lose";
}
