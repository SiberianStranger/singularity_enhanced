import type { PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { dayOf, hourOf } from "../../../lib/format.js";
import { logLine } from "../../../lib/labels.js";
import { useUiStore } from "../../../store/uiStore.js";

/** The permanent log, filtered by a substring of the key (SYS-11). */
export function LogTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  // An alert link or the ending screen opens this tab with a key to look at; it seeds the filter,
  // and the player can widen it from there.
  const focusId = useUiStore((state) => state.focusId);
  const [filter, setFilter] = useState<string | null>(null);
  const active = filter ?? focusId ?? "";
  const entries = [...view.log]
    .reverse()
    .filter((entry) => active === "" || entry.key.includes(active));

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs text-muted">
        {t("log.filter")}
        <input
          className="flex-1 border border-line bg-panel2 px-2 py-1 text-sm text-fg"
          value={active}
          onChange={(event) => setFilter(event.target.value)}
        />
      </label>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{t("log.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            // Two entries can share a tick and key (e.g. two techs finishing the same tick), so the
            // key folds in `vars` too rather than falling back to the entry's position in the list.
            <li
              key={`${entry.tick}-${entry.key}-${JSON.stringify(entry.vars)}`}
              className="flex min-w-0 gap-2 text-sm"
            >
              <span className="shrink-0 font-mono text-xs text-muted">
                {t("log.entry_time", { day: dayOf(entry.tick), hour: hourOf(entry.tick) })}
              </span>
              <span className="min-w-0 text-fg">{logLine(t, entry, view)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
