import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { catalog } from "../../../content/catalog.js";
import { PRIMARY_TABS, type PrimaryTab, useUiStore } from "../../../store/uiStore.js";

/** The in-game encyclopedia, grouped by area, with links to the panel each entry explains. */
export function KnowledgeTab(): ReactNode {
  const { t } = useTranslation();
  const openTab = useUiStore((state) => state.openTab);
  const [area, setArea] = useState<string>("");
  const areas = [...new Set(catalog.knowledge.map((entry) => entry.area))].sort();
  const entries = catalog.knowledge.filter((entry) => area === "" || entry.area === area);

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
          <li key={entry.id} className="border border-line bg-panel p-2">
            <h3 className="text-sm font-semibold text-fg">{t(entry.name_key)}</h3>
            <p className="mt-1 text-sm text-muted">{t(entry.desc_key)}</p>
            {entry.panel !== undefined && PRIMARY_TABS.includes(entry.panel as PrimaryTab) ? (
              <Button className="mt-2" onClick={() => openTab(entry.panel as PrimaryTab)}>
                {t("knowledge.open_panel", { panel: t(`panel.${entry.panel}`) })}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
