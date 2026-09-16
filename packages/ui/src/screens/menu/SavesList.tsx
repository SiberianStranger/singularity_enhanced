import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import {
  deleteSave,
  fromFileText,
  listSaves,
  putSave,
  type SaveRecord,
  toFileText,
} from "../../saves/db.js";

interface SavesListProps {
  onLoad(record: SaveRecord): void;
}

/** The saves in IndexedDB, with date, seed and day, plus export and import to a file (SYS-15). */
export function SavesList({ onLoad }: SavesListProps): ReactNode {
  const { t } = useTranslation();
  const [saves, setSaves] = useState<SaveRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    void listSaves().then(setSaves);
  }, []);

  useEffect(refresh, [refresh]);

  const onImport = async (file: File): Promise<void> => {
    try {
      await putSave(fromFileText(await file.text()));
      setError(null);
      refresh();
    } catch {
      setError(t("saves.import_failed"));
    }
  };

  const onExport = (record: SaveRecord): void => {
    const url = URL.createObjectURL(new Blob([toFileText(record)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${record.id}.s3.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {saves.length === 0 ? (
        <p className="text-sm text-muted">{t("menu.saves_empty")}</p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
          {saves.map((record) => (
            <li
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-panel2 px-3 py-2"
            >
              <span className="flex flex-col">
                <span className="text-sm text-fg">
                  {/* Autosave and quicksave store a locale key; a named save stores the name. */}
                  {record.label.includes(".") ? t(record.label) : record.label}
                </span>
                <span className="font-mono text-xs text-muted">
                  {t("menu.save_meta", {
                    date: record.createdAtIso.slice(0, 16).replace("T", " "),
                    seed: record.seed,
                    day: record.day,
                  })}
                </span>
              </span>
              <span className="flex gap-1">
                <Button variant="primary" onClick={() => onLoad(record)}>
                  {t("menu.load")}
                </Button>
                <Button onClick={() => onExport(record)}>{t("menu.export_save")}</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    void deleteSave(record.id).then(refresh);
                  }}
                >
                  {t("menu.delete_save")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error === null ? null : <p className="text-sm text-crit">{error}</p>}
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) {
              void onImport(file);
            }
          }}
        />
        <Button onClick={() => fileInput.current?.click()}>{t("menu.import_save")}</Button>
      </div>
    </div>
  );
}
