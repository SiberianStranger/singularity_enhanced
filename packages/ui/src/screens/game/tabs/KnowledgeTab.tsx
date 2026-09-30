import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { catalog } from "../../../content/catalog.js";
import { linkLabelKey, resolveLink, useUiStore } from "../../../store/uiStore.js";

/** The in-game encyclopedia, grouped by area, with links to the panel each entry explains. */
export function KnowledgeTab(): ReactNode {
  const { t } = useTranslation();
  const followLink = useUiStore((state) => state.followLink);
  // A panel that opens this window for one entry names it (`openOverlay("knowledge", id)`), so the
  // window opens on that entry's area with the entry first and outlined, rather than on the whole
  // list with the answer somewhere in it.
  const focus = useUiStore((state) => state.overlayFocus);
  const focused = catalog.knowledge.find((entry) => entry.id === focus);
  const [area, setArea] = useState<string>(focused?.area ?? "");
  const areas = [...new Set(catalog.knowledge.map((entry) => entry.area))].sort();
  const entries = catalog.knowledge
    .filter((entry) => area === "" || entry.area === area)
    .sort((a, b) => Number(b.id === focus) - Number(a.id === focus));

  if (catalog.knowledge.length === 0) {
    return <p className="text-sm text-muted">{t("knowledge.empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <Button variant={area === "" ? "primary" : "ghost"} onClick={() => setArea("")}>
          {t("common.all")}
        </Button>
        {areas.map((entry) => (
          <Button
            key={entry}
            variant={area === entry ? "primary" : "ghost"}
            onClick={() => setArea(entry)}
          >
            {entry}
          </Button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            data-testid={`knowledge-${entry.id}`}
            className={`border bg-panel p-2 ${
              entry.id === focus ? "border-linestrong" : "border-line"
            }`}
          >
            <h3 className="text-sm font-semibold text-fg">{t(entry.name_key)}</h3>
            <p className="mt-1 text-sm text-muted">{t(entry.desc_key)}</p>
            {(() => {
              // The panel the entry explains, wherever it lives now: a tab, a window or the sheet.
              const target = resolveLink(entry.panel);
              return target === null ||
                (target.kind === "overlay" && target.overlay === "knowledge") ? null : (
                <Button className="mt-2" onClick={() => followLink(entry.panel)}>
                  {t("knowledge.open_panel", { panel: t(linkLabelKey(target)) })}
                </Button>
              );
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}
