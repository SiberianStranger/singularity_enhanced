import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { endingClass, useAudioUnlock, useMusicForScreen } from "./audio/index.js";
import { directionOf, setLanguage } from "./i18n/index.js";
import { ConfiguratorScreen } from "./screens/configurator/ConfiguratorScreen.js";
import { GameScreen } from "./screens/game/GameScreen.js";
import { MainMenuScreen } from "./screens/menu/MainMenuScreen.js";
import { useGameStore } from "./store/gameStore.js";
import { autoUiScale, useUiStore } from "./store/uiStore.js";

/** Applies theme, text size, the CRT overlay and language to the document root (SYS-11, SYS-14). */
function useDocumentChrome(): void {
  const theme = useUiStore((state) => state.theme);
  const uiScale = useUiStore((state) => state.uiScale);
  const uiScaleAuto = useUiStore((state) => state.uiScaleAuto);
  const setUiScaleFromWindow = useUiStore((state) => state.setUiScaleFromWindow);
  const displayScale = useUiStore((state) => state.displayScale);
  const fontFace = useUiStore((state) => state.fontFace);
  const language = useUiStore((state) => state.language);
  const crt = useUiStore((state) => state.crt);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // The optional CRT overlay (style guide rule 9) is one attribute and one pseudo-element, so no
  // component knows about it and switching it off costs nothing.
  useEffect(() => {
    if (crt) {
      document.documentElement.dataset.crt = "on";
    } else {
      delete document.documentElement.dataset.crt;
    }
  }, [crt]);

  // Everything in the client is sized in rem, so one number on the root scales the whole
  // interface: tables, panels and the angular labels together (playtest 3, R13).
  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
  }, [uiScale]);

  // Auto (playtest 5, L12): the scale follows the window, picking the largest one the layout still
  // fits in. It is debounced because a window drag fires resize every frame and the scale changes
  // the size of everything on screen; a sixth of a second of stillness is the trigger, and the
  // first pick is immediate so the interface is never briefly the wrong size on load.
  useEffect(() => {
    if (!uiScaleAuto) {
      return;
    }
    const pick = (): void => {
      setUiScaleFromWindow(autoUiScale(window.innerWidth, window.innerHeight));
    };
    pick();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(pick, 160);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [uiScaleAuto, setUiScaleFromWindow]);

  useEffect(() => {
    document.documentElement.style.setProperty("--display-scale", String(displayScale));
  }, [displayScale]);

  // The angular face is a token, so switching it off is one attribute (playtest 1, U9).
  useEffect(() => {
    document.documentElement.dataset.font = fontFace === "plain" ? "plain" : "original";
  }, [fontFace]);

  useEffect(() => {
    setLanguage(language);
    document.documentElement.dir = directionOf(language);
  }, [language]);
}

export function App(): ReactNode {
  const screen = useGameStore((state) => state.screen);
  const { t } = useTranslation();
  useDocumentChrome();
  useAudioUnlock();
  // Which class plays is decided here and nowhere else: the menu, the configurator and a running
  // game share the `music/` shuffle, and an ending switches to `win/` or `lose/` until the run is
  // left. The selector returns the same object between ticks, so it does not re-render the app.
  const over = useGameStore((state) => state.view?.game_over ?? null);
  useMusicForScreen(over === null ? "music" : endingClass(over.reason));

  return (
    <>
      <a className="sr-only-focusable absolute z-200 m-2 bg-panel px-2 py-1" href="#main">
        {t("app.skip_to_content")}
      </a>
      {screen === "menu" ? <MainMenuScreen /> : null}
      {screen === "configurator" ? <ConfiguratorScreen /> : null}
      {screen === "game" ? <GameScreen /> : null}
    </>
  );
}
