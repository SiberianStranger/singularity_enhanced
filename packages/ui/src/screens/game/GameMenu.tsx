import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";
import { dayOf } from "../../lib/format.js";
import { manualId, putSave, type SaveRecord } from "../../saves/db.js";
import { useGameStore } from "../../store/gameStore.js";
import { SavesList } from "../menu/SavesList.js";

interface GameMenuProps {
  onClose(): void;
  ironman: boolean;
}

/** The Escape menu: resume, save, load, settings, back to the main menu. */
export function GameMenu({ onClose, ironman }: GameMenuProps): ReactNode {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"menu" | "save" | "load">("menu");
  const [label, setLabel] = useState("");
  const endSession = useGameStore((state) => state.endSession);
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

  return (
    <Modal
      title={t("game.menu")}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t("game.menu.resume")}</Button>}
    >
      {mode === "menu" ? (
        <div className="flex flex-col gap-2">
          <Button
            disabled={ironman}
            tooltip={ironman ? t("game.quicksave_blocked") : undefined}
            onClick={() => setMode("save")}
          >
            {t("game.menu.save")}
          </Button>
          <Button
            disabled={ironman}
            tooltip={ironman ? t("game.quicksave_blocked") : undefined}
            onClick={() => setMode("load")}
          >
            {t("game.menu.load")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              endSession();
            }}
          >
            {t("game.menu.main_menu")}
          </Button>
        </div>
      ) : mode === "save" ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("game.menu.save_name")}
            <input
              className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={() => setMode("menu")}>{t("common.back")}</Button>
            <Button
              variant="primary"
              onClick={() => {
                void save();
              }}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <SavesList onLoad={load} />
          <Button onClick={() => setMode("menu")}>{t("common.back")}</Button>
        </div>
      )}
    </Modal>
  );
}
