import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { accelerator } from "../../lib/accelerators.js";
import { dayOf } from "../../lib/format.js";
import { manualId, putSave, type SaveRecord } from "../../saves/db.js";
import { useGameStore } from "../../store/gameStore.js";
import { type MenuSection, useUiStore } from "../../store/uiStore.js";
import { AboutBody } from "../menu/AboutDialog.js";
import { SavesList } from "../menu/SavesList.js";
import { GameSettings } from "./GameSettings.js";
import { MessageSettings } from "./MessageSettings.js";

interface GameMenuProps {
  section: MenuSection;
  onClose(): void;
  ironman: boolean;
}

/**
 * The menu overlay behind the Menu button and Escape: resume, save, load, settings, message
 * settings, a new game and quitting to the main menu.
 *
 * Settings and message settings live here rather than as tabs of the game panel (playtest 1, U5):
 * they are not part of playing, and a panel tab for them is a tab the player scrolls past forever.
 * The cog on a toast or an event window opens this overlay straight on the message settings, so
 * "stop telling me this" is still one click in context (SYS-11).
 */
export function GameMenu({ section, onClose, ironman }: GameMenuProps): ReactNode {
  const { t } = useTranslation();
  const [label, setLabel] = useState("");
  const openMenu = useUiStore((state) => state.openMenu);
  const endSession = useGameStore((state) => state.endSession);
  const goTo = useGameStore((state) => state.goTo);
  const loadSave = useGameStore((state) => state.loadSave);

  const save = async (): Promise<void> => {
    const { saveGame, setup, view } = useGameStore.getState();
    if (setup === null || view === null) {
      return;
    }
    const data = await saveGame();
    const name = label.trim() === "" ? t("saves.named", { label: view.tick }) : label.trim();
    await putSave({
      id: manualId(name),
      kind: "manual",
      label: name,
      createdAtIso: new Date().toISOString(),
      seed: setup.seed,
      day: dayOf(view.tick),
      tick: view.tick,
      setup,
      data,
    });
    onClose();
  };

  const load = (record: SaveRecord): void => {
    void loadSave(record.data);
    onClose();
  };

  const title =
    section === "settings"
      ? t("panel.settings")
      : section === "messages"
        ? t("panel.messages")
        : section === "about"
          ? t("about.title")
          : t("game.menu");

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide={section === "messages"}
      footer={
        section === "root" ? (
          <Button onClick={onClose}>{t("game.menu.resume")}</Button>
        ) : (
          <Button onClick={() => openMenu("root")}>{t("common.back")}</Button>
        )
      }
    >
      {section === "root" ? (
        <div className="flex flex-col gap-2">
          <Button
            disabled={ironman}
            tooltip={ironman ? t("game.quicksave_blocked") : undefined}
            onClick={() => openMenu("save")}
          >
            {t("game.menu.save")}
          </Button>
          <Button
            disabled={ironman}
            tooltip={ironman ? t("game.quicksave_blocked") : undefined}
            onClick={() => openMenu("load")}
          >
            {t("game.menu.load")}
          </Button>
          <Button
            hotkey={accelerator(t, "game.menu.settings")}
            onClick={() => openMenu("settings")}
          >
            {t("game.menu.settings")}
          </Button>
          <Button hotkey={accelerator(t, "panel.messages")} onClick={() => openMenu("messages")}>
            {t("panel.messages")}
          </Button>
          <Button hotkey={accelerator(t, "menu.about")} onClick={() => openMenu("about")}>
            {t("menu.about")}
          </Button>
          <Button
            onClick={() => {
              endSession();
              goTo("configurator");
            }}
          >
            {t("menu.new_game")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              endSession();
            }}
          >
            {t("game.menu.quit")}
          </Button>
        </div>
      ) : section === "save" ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("game.menu.save_name")}
            <input
              className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <Button
            variant="primary"
            onClick={() => {
              void save();
            }}
          >
            {t("common.confirm")}
          </Button>
        </div>
      ) : section === "load" ? (
        <SavesList onLoad={load} />
      ) : section === "settings" ? (
        <GameSettings />
      ) : section === "about" ? (
        <AboutBody />
      ) : (
        <MessageSettings />
      )}
    </Modal>
  );
}
