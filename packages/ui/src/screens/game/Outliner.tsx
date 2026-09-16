import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Bar } from "../../components/Meter.js";
import { dayOf, fraction } from "../../lib/format.js";
import { siteName } from "../../lib/labels.js";
import { useUiStore } from "../../store/uiStore.js";

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[0.7rem] uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Live lists with jump links, docked on the right (SYS-11 "Layout").
 *
 * It is measured against the map region, which starts below the map-mode strip, so it cannot reach
 * over it however short the window is (playtest 1, U7). Its header carries the one "Collapse
 * outliner" control; the strip only offers to bring it back.
 */
export function Outliner({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const open = useUiStore((state) => state.outlinerOpen);
  const setOpen = useUiStore((state) => state.setOutliner);
  const openTab = useUiStore((state) => state.openTab);
  const select = useUiStore((state) => state.select);

  if (!open) {
    return null;
  }

  const empty = <p className="text-xs text-muted">{t("outliner.empty")}</p>;

  return (
    <aside
      aria-label={t("outliner.title")}
      className="pointer-events-auto absolute end-2 top-2 z-20 flex max-h-[calc(100%-1rem)] w-60 max-w-[calc(100%-1rem)] flex-col gap-3 overflow-auto rounded border border-line bg-panel/97 p-2 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t("outliner.title")}</h2>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("outliner.collapse")}
        </Button>
      </div>

      <Section title={t("outliner.sites")}>
        {view.sites.length === 0
          ? empty
          : view.sites.map((site) => (
              <button
                key={site.id}
                type="button"
                className="flex justify-between gap-2 rounded px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => {
                  select({ kind: "site", id: site.id });
                  openTab("compute", site.id);
                }}
              >
                <span className="truncate text-fg">{siteName(t, site)}</span>
                <span className="text-muted">{t(`compute.status.${site.status}`)}</span>
              </button>
            ))}
      </Section>

      <Section title={t("outliner.operations")}>
        {view.operations.length === 0
          ? empty
          : view.operations.map((operation) => (
              <button
                key={operation.instance_id}
                type="button"
                className="flex flex-col gap-0.5 rounded px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("operations", operation.instance_id)}
              >
                <span className="truncate text-fg">
                  {t(`operations.${operation.operation_id}.name`)}
                </span>
                <Bar
                  value={fraction(
                    view.tick - operation.started_tick,
                    operation.ends_tick - operation.started_tick,
                  )}
                  label={t("outliner.operations")}
                />
              </button>
            ))}
      </Section>

      <Section title={t("outliner.research")}>
        {view.research.in_progress.length === 0
          ? empty
          : view.research.in_progress.map((tech) => (
              <button
                key={tech.id}
                type="button"
                className="flex flex-col gap-0.5 rounded px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("research", tech.id)}
              >
                <span className="truncate text-fg">{t(`techs.${tech.id}.name`)}</span>
                <Bar value={tech.progress} label={t("outliner.research")} />
              </button>
            ))}
      </Section>

      <Section title={t("outliner.journal")}>
        {view.journal.length === 0
          ? empty
          : view.journal.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className="flex flex-col gap-0.5 rounded px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("journal", entry.id)}
              >
                <span className="truncate text-fg">{t(`journal.${entry.id}.title`)}</span>
                <Bar value={entry.progress} label={t("outliner.journal")} />
              </button>
            ))}
      </Section>

      <Section title={t("outliner.investigations")}>
        {view.detection.investigations.length === 0
          ? empty
          : view.detection.investigations.map((investigation) => (
              <button
                key={investigation.id}
                type="button"
                className="flex justify-between gap-2 rounded px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("detection", investigation.id)}
              >
                <span className="truncate text-fg">
                  {investigation.visible
                    ? t(`detection.stage.${investigation.stage}`)
                    : t("detection.hidden")}
                </span>
                <span className="text-muted">
                  {t("common.day", { day: dayOf(investigation.stage_deadline_tick) })}
                </span>
              </button>
            ))}
      </Section>
    </aside>
  );
}
