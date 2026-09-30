import { CONTEXT_STEPS_K, type PlayerView, type SiteView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { precisionRows } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";

/** A context window in the units the player reads: thousands of tokens, millions above 1,000k. */
function contextText(t: ReturnType<typeof useTranslation>["t"], contextK: number): string {
  if (contextK <= 0) {
    return t("compute.no_fit");
  }
  return contextK >= 1000
    ? t("common.context_m", { value: (contextK / 1000).toFixed(contextK % 1000 === 0 ? 0 : 1) })
    : t("common.context_k", { value: contextK });
}

/**
 * What raising the precision buys and what it costs, in one table (playtest 1 C3, playtest 2 K9).
 *
 * The playtest's first complaint was exact: raising the precision lowers the compute, so why raise
 * it? Because the copy is more capable. Both halves of that trade are columns here.
 *
 * The context window (SYS-03) adds the second trade to the same table: the memory column is now
 * the weights *plus* the cache the working context costs, so a longer context and a higher
 * precision are visibly competing for one number, and the "max ctx" column says how far the
 * context could go if the precision stayed where it is. Nine columns did not fit at 1366 px
 * (playtest 3, R4), so the separate "fits" column is gone: a row that does not fit is red, and the
 * tooltip on the memory cell breaks it back into weights and cache.
 */
export function PrecisionTable({ view, site }: { view: PlayerView; site: SiteView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const rows = precisionRows(view);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
        {t("compute.precision_table")}
      </h4>
      <div className="overflow-x-auto">
        <Table
          rows={rows}
          rowKey={(row) => row.precision}
          selectedKey={site.precision}
          empty={t("compute.no_fit")}
          caption={t("compute.precision_table")}
          columns={[
            {
              id: "precision",
              /*
               * The row-label column, and the only header that names what the rows are rather than
               * what a number means: the caption above the table already says "precision", and the
               * cells say "int4" and "bf16", so the word is kept for assistive technology and taken
               * off the screen. Printed, it was the widest header in the table and the reason the
               * eight columns needed a sideways scroll in Russian (playtest 8, Z13).
               */
              header: <span className="sr-only">{t("compute.precision")}</span>,
              cell: (row) => (
                /*
                 * The running row is the accented one, and it says "(running)" only to a screen
                 * reader (playtest 8, Z13). Printed, those eight characters were the widest cell
                 * in the table, and in Russian they pushed the whole thing into a sideways scroll
                 * at 1280 by 720; the row is already tinted and accented, which is the same
                 * information in no width at all.
                 */
                <span className={row.is_current ? "font-semibold text-accentline" : ""}>
                  {t(`precision.${row.precision}`)}
                  {row.is_current ? (
                    <span className="sr-only"> {t("compute.precision_current")}</span>
                  ) : null}
                </span>
              ),
            },
            {
              id: "memory",
              header: t("compute.memory_short"),
              align: "end",
              cell: (row) => (
                <Tooltip
                  content={t("compute.memory_breakdown", {
                    weights: Math.round(row.memory_gb),
                    kv: Math.round(row.kv_gb ?? 0),
                  })}
                >
                  <span className={row.fits ? "" : "text-crit"}>
                    {t("common.gb", { value: Math.round(row.total_memory_gb ?? row.memory_gb) })}
                  </span>
                </Tooltip>
              ),
            },
            {
              id: "context",
              header: t("compute.max_context"),
              align: "end",
              cell: (row) => contextText(t, row.max_context_k ?? 0),
            },
            {
              id: "capability",
              header: t("compute.capability_short"),
              align: "end",
              cell: (row) => t("common.percent", { value: row.capability_factor }),
            },
            {
              id: "compute",
              header: t("common.ch_per_day_short"),
              align: "end",
              cell: (row) => Math.round(row.compute_hours_per_day),
            },
            {
              id: "research",
              header: t("compute.research_short"),
              align: "end",
              cell: (row) => Math.round(row.effective_research_per_day),
            },
            {
              id: "income",
              header: t("compute.income_short"),
              align: "end",
              cell: (row) => t("common.usd_exact", { value: row.effective_income_per_day }),
            },
            {
              id: "use",
              header: t("compute.use"),
              cell: (row) => (
                <Button
                  /*
                   * The narrowest button in the game, by four pixels a side: eight columns at
                   * 1280 by 720 in Russian came to six pixels more than the panel, and a table
                   * that scrolls sideways is the thing playtest 8 asked to be rid of (Z13). The
                   * padding is set here rather than by a class because a utility that competes
                   * with the component's own `px-2` wins or loses by stylesheet order.
                   */
                  style={{ paddingInline: "0.25rem" }}
                  disabled={!row.fits || row.is_current}
                  tooltip={row.fits ? undefined : t("compute.no_fit")}
                  onClick={() => {
                    void send({
                      type: "set_precision",
                      siteId: site.id,
                      precision: row.precision,
                    });
                  }}
                >
                  {t("compute.use")}
                </Button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

/**
 * The context dial (SYS-03 "What a context window buys", SYS-04 v0.2).
 *
 * It sits next to the precision table because the two decide one thing between them: the memory on
 * this site. Raising the window costs cache, which can push the copy down a precision; raising the
 * precision costs weights, which shortens the window that still fits. The ladder only offers the
 * steps the lineage and the site can actually carry, so the dial cannot produce a command the
 * engine refuses.
 */
export function ContextDial({ view, site }: { view: PlayerView; site: SiteView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const self = view.self;
  const current = self.context_k_used ?? 0;
  const precision = site.precision;
  const row = precisionRows(view).find((entry) => entry.precision === precision);
  const ceiling = Math.min(self.context_k ?? 0, row?.max_context_k ?? self.context_k ?? 0);
  const steps = CONTEXT_STEPS_K.filter((k) => k <= ceiling);

  if (self.context_k === undefined || steps.length === 0) {
    return null;
  }

  return (
    <section data-testid="context-dial" className="flex flex-col gap-2 border border-line p-2">
      <h4 className="text-xs uppercase tracking-wide text-muted">{t("compute.context")}</h4>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-muted">
          {t("compute.context_window")}
          <select
            aria-label={t("compute.context_window")}
            className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            value={String(current)}
            onChange={(event) => {
              void send({
                type: "set_context",
                siteId: site.id,
                context_k: Number(event.target.value),
              });
            }}
          >
            {steps.map((k) => (
              <option key={k} value={k}>
                {contextText(t, k)}
              </option>
            ))}
          </select>
        </label>
        <Tooltip content={t("compute.kv_hint")}>
          <span className="text-xs text-muted">
            {t("compute.kv_cost")}{" "}
            <span className="font-mono text-fg">
              {t("common.gb", { value: Math.round(self.kv_gb ?? 0) })}
            </span>
          </span>
        </Tooltip>
        <Tooltip content={t("compute.long_horizon_hint")}>
          <span className="text-xs text-muted">
            {t("compute.long_horizon")}{" "}
            <span
              className={`font-mono ${(self.long_horizon_multiplier ?? 1) > 1.01 ? "text-ok" : "text-fg"}`}
            >
              {t("common.times", { value: (self.long_horizon_multiplier ?? 1).toFixed(2) })}
            </span>
          </span>
        </Tooltip>
        <Tooltip content={t("compute.reliability_hint")}>
          <span className="text-xs text-muted">
            {t("compute.reliability")}{" "}
            <span className="font-mono text-fg">
              {t("common.percent", { value: self.context_reliability ?? 1 })}
            </span>
          </span>
        </Tooltip>
      </div>
      {/*
       * The one paragraph SYS-03's notes ask for: what the precision ladder actually buys. It is
       * prose, in the readable face, at the measure, because it is the only thing on this tab that
       * is meant to be read rather than scanned.
       */}
      <p className="prose text-muted">{t("compute.precision_explainer")}</p>
    </section>
  );
}
