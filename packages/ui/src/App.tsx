import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { directionOf, setLanguage } from "./i18n/index.js";
import { ConfiguratorScreen } from "./screens/configurator/ConfiguratorScreen.js";
import { GameScreen } from "./screens/game/GameScreen.js";
import { MainMenuScreen } from "./screens/menu/MainMenuScreen.js";
import { useGameStore } from "./store/gameStore.js";
import { TEXT_SCALE, useUiStore } from "./store/uiStore.js";

/** Applies theme, text size and language to the document root (SYS-11, SYS-14). */
function useDocumentChrome(): void {
  const theme = useUiStore((state) => state.theme);
  const textSize = useUiStore((state) => state.textSize);
  const language = useUiStore((state) => state.language);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(TEXT_SCALE[textSize]));
  }, [textSize]);

  useEffect(() => {
    setLanguage(language);
    document.documentElement.dir = directionOf(language);
  }, [language]);
}

export function App(): ReactNode {
  const screen = useGameStore((state) => state.screen);
  const { t } = useTranslation();
  useDocumentChrome();

  return (
    <>
      <a className="sr-only-focusable absolute z-200 m-2 rounded bg-panel px-2 py-1" href="#main">
        {t("app.skip_to_content")}
      </a>
      {screen === "menu" ? <MainMenuScreen /> : null}
      {screen === "configurator" ? <ConfiguratorScreen /> : null}
      {screen === "game" ? <GameScreen /> : null}
    </>
  );
}
