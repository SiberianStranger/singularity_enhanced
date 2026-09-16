import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { SettingsControls } from "../../components/SettingsControls.js";
import type { SaveRecord } from "../../saves/db.js";
import { useGameStore } from "../../store/gameStore.js";
import { AboutDialog } from "./AboutDialog.js";
import { SavesList } from "./SavesList.js";

type Dialog = "none" | "load" | "settings" | "about";

export function MainMenuScreen(): ReactNode {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<Dialog>("none");
  const goTo = useGameStore((state) => state.goTo);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const error = useGameStore((state) => state.error);

  const onLoad = (record: SaveRecord): void => {
    setDialog("none");
    void resumeGame(record.setup, record.data);
  };

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg px-4 py-10"
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {t("app.title")}
        </h1>
        <p className="max-w-prose text-sm text-muted">{t("app.tagline")}</p>
      </header>

      <nav className="flex w-full max-w-xs flex-col gap-2">
        <Button variant="primary" className="py-2" onClick={() => goTo("configurator")}>
          {t("menu.new_game")}
        </Button>
        <Button className="py-2" onClick={() => setDialog("load")}>
          {t("menu.load_game")}
        </Button>
        <Button className="py-2" onClick={() => setDialog("settings")}>
          {t("menu.settings")}
        </Button>
        <Button className="py-2" onClick={() => setDialog("about")}>
          {t("menu.about")}
        </Button>
      </nav>

      <p className="text-xs text-muted">{t("menu.version")}</p>
      {error === null ? null : <p className="text-sm text-crit">{error}</p>}

      {dialog === "load" ? (
        <Modal
          title={t("menu.load_game")}
          onClose={() => setDialog("none")}
          footer={<Button onClick={() => setDialog("none")}>{t("common.close")}</Button>}
        >
          <SavesList onLoad={onLoad} />
        </Modal>
      ) : null}

      {dialog === "settings" ? (
        <Modal
          title={t("menu.settings")}
          onClose={() => setDialog("none")}
          footer={<Button onClick={() => setDialog("none")}>{t("common.close")}</Button>}
        >
          <SettingsControls />
        </Modal>
      ) : null}

      {dialog === "about" ? <AboutDialog onClose={() => setDialog("none")} /> : null}
    </main>
  );
}
