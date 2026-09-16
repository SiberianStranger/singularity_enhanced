import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Frame } from "../../components/Frame.js";
import { Glyph, sceneGlyph } from "../../components/glyphs.js";
import { Bar } from "../../components/Meter.js";
import { dayOf, fraction } from "../../lib/format.js";
import { siteName } from "../../lib/labels.js";
import { useUiStore } from "../../store/uiStore.js";

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs uppercase tracking-wide text-muted">{title}</h3>
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
    // The map-mode strip used to carry this control; the strip is gone (playtest 3, R10), so the
    // one way back is a button where the outliner itself was.
    return (
      <div className="pointer-events-auto col-start-3 row-start-1 self-start justify-self-end">
        <Button onClick={() => setOpen(true)}>{t("outliner.expand")}</Button>
      </div>
    );
  }

  const empty = <p className="text-xs text-muted">{t("outliner.empty")}</p>;

  return (
    <Frame
      title={t("outliner.title")}
      // The right-hand column of the screen grid (L8). Below 66rem of map region the body is
      // hidden and only the title bar is left, so the outliner is a strip the player can collapse
      // or read past rather than a column the map cannot spare; that is the first step of the
      // reflow order (L11).
      className="pointer-events-auto col-start-3 row-start-1 max-h-[calc(100%-3rem)] w-56 max-w-full self-start bg-panel/97 @max-[66rem]/screen:w-auto"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 @max-[66rem]/screen:hidden"
      actions={
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("outliner.collapse")}
        </Button>
      }
    >
      <Section title={t("outliner.sites")}>
        {view.sites.length === 0
          ? empty
          : view.sites.map((site) => (
              <button
                key={site.id}
                type="button"
                className="flex justify-between gap-2 px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => {
                  select({ kind: "site", id: site.id });
                  openTab("compute", site.id);
                }}
              >
                <span className="flex min-w-0 flex-1 items-start gap-1 text-fg">
                  {/* The glyph learned on the configurator's origin list (playtest 3, R15). */}
                  <Glyph className="mt-0.5 shrink-0" name={sceneGlyph(site.kind)} size={13} />
                  {/* L7: "Colocation cage, ..." told the player nothing; the name wraps instead. */}
                  <span className="min-w-0">{siteName(t, site)}</span>
                </span>
                <span className="shrink-0 text-muted">{t(`compute.status.${site.status}`)}</span>
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
                className="flex flex-col gap-0.5 px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("operations", operation.instance_id)}
              >
                <span className="min-w-0 text-fg">
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
                className="flex flex-col gap-0.5 px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("research", tech.id)}
              >
                <span className="min-w-0 text-fg">{t(`techs.${tech.id}.name`)}</span>
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
                className="flex flex-col gap-0.5 px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("journal", entry.id)}
              >
                <span className="min-w-0 text-fg">{t(`journal.${entry.id}.title`)}</span>
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
                className="flex justify-between gap-2 px-1 py-0.5 text-start text-xs hover:bg-panel2"
                onClick={() => openTab("detection", investigation.id)}
              >
                <span className="min-w-0 text-fg">
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
    </Frame>
  );
}
