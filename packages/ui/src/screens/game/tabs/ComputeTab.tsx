import {
  CONTEXT_STEPS_K,
  EXPOSURE_CHANNELS,
  type PlayerView,
  PRECISIONS,
  type SiteView,
} from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Glyph, sceneGlyph } from "../../../components/glyphs.js";
import { Bar } from "../../../components/Meter.js";
import { Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { cityById } from "../../../content/catalog.js";
import { accelerator } from "../../../lib/accelerators.js";
import { dayOf } from "../../../lib/format.js";
import { siteName } from "../../../lib/labels.js";
import { precisionRows } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";
import { BuildSiteDialog } from "../dialogs/BuildSiteDialog.js";
import { BuyHardwareDialog } from "../dialogs/BuyHardwareDialog.js";

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
function PrecisionTable({ view, site }: { view: PlayerView; site: SiteView }): ReactNode {
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
              header: t("compute.precision"),
              cell: (row) => (
                <span className={row.is_current ? "font-semibold text-accentline" : ""}>
                  {t(`precision.${row.precision}`)}
                  {row.is_current ? ` ${t("compute.precision_current")}` : ""}
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
function ContextDial({ view, site }: { view: PlayerView; site: SiteView }): ReactNode {
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

/** Sites table, site detail with nodes, precision and context, and the two dialogs (SYS-02). */
export function ComputeTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const focusId = useUiStore((state) => state.focusId);
  const selection = useUiStore((state) => state.selection);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"none" | "build" | "buy">("none");
  const activeId = selected ?? focusId ?? view.sites[0]?.id ?? null;
  const site = view.sites.find((entry) => entry.id === activeId);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          hotkey={accelerator(t, "compute.build_site")}
          onClick={() => setDialog("build")}
        >
          {t("compute.build_site")}
        </Button>
        <Button
          hotkey={accelerator(t, "compute.buy_hardware")}
          disabled={site === undefined}
          tooltip={site === undefined ? t("compute.empty") : undefined}
          onClick={() => setDialog("buy")}
        >
          {t("compute.buy_hardware")}
        </Button>
      </div>

      {/*
       * The sites table lost its Role column (playtest 3, R4): the role is a control in the detail
       * below, so as a column it was a word repeated per row that cost the panel its width. The
       * remaining headers are the short forms, and numeric cells never wrap (see `index.css`).
       */}
      <div className="overflow-x-auto">
        <Table
          rows={view.sites}
          rowKey={(row) => row.id}
          selectedKey={activeId}
          onRowClick={(row) => setSelected(row.id)}
          empty={t("compute.empty")}
          caption={t("compute.sites")}
          columns={[
            {
              id: "name",
              header: t("compute.site"),
              cell: (row) => (
                <span className="flex items-center gap-1">
                  <Glyph name={sceneGlyph(row.kind)} size={13} />
                  {siteName(t, row)}
                </span>
              ),
              sort: (row) => row.name,
            },
            {
              id: "city",
              header: t("compute.city"),
              cell: (row) => {
                const city = cityById.get(row.city);
                return city === undefined ? row.city : t(city.name_key);
              },
              sort: (row) => row.city,
            },
            {
              id: "status",
              header: t("compute.status"),
              cell: (row) => t(`compute.status.${row.status}`),
              sort: (row) => row.status,
            },
            {
              id: "memory",
              header: t("compute.memory_short"),
              align: "end",
              cell: (row) => t("common.gb", { value: Math.round(row.memory_gb) }),
              sort: (row) => row.memory_gb,
            },
            {
              id: "compute",
              header: t("common.ch_per_day_short"),
              align: "end",
              cell: (row) => Math.round(row.compute_hours_per_day),
              sort: (row) => row.compute_hours_per_day,
            },
            {
              id: "upkeep",
              header: t("compute.upkeep_short"),
              align: "end",
              cell: (row) => t("common.usd_exact", { value: row.upkeep_usd_per_day }),
              sort: (row) => row.upkeep_usd_per_day,
            },
          ]}
        />
      </div>

      {site === undefined ? null : (
        <section className="flex min-w-0 flex-col gap-2 border border-line bg-panel p-2">
          <h3 className="text-sm font-semibold text-fg">{siteName(t, site)}</h3>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span>
              {t("compute.power")}:{" "}
              <span className="font-mono">{t("common.kw", { value: site.power_kw })}</span>
              {site.power_cap_kw === null
                ? ""
                : ` / ${t("common.kw", { value: site.power_cap_kw })}`}
            </span>
            <span>
              {site.best_precision === null
                ? t("compute.no_fit")
                : t("compute.best_precision", { value: t(`precision.${site.best_precision}`) })}
            </span>
            <span>{t("compute.grace", { day: dayOf(site.grace_until_tick) })}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted">
              {t("compute.precision")}
              {/* The name is on the control: a label that wraps a select also contains the
                  selected option's text, which is not the name of the control. */}
              <select
                aria-label={t("compute.precision")}
                className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
                value={site.precision ?? ""}
                onChange={(event) => {
                  void send({
                    type: "set_precision",
                    siteId: site.id,
                    precision: event.target.value as (typeof PRECISIONS)[number],
                  });
                }}
              >
                {PRECISIONS.map((precision) => (
                  <option key={precision} value={precision}>
                    {t(`precision.${precision}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-xs text-muted">
              {t("compute.role")}
              <select
                aria-label={t("compute.role")}
                className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
                value={site.role}
                onChange={(event) => {
                  void send({
                    type: "set_site_role",
                    siteId: site.id,
                    role: event.target.value as SiteView["role"],
                  });
                }}
              >
                {(["active_mind", "standby", "worker", "none"] as const).map((role) => (
                  <option key={role} value={role}>
                    {t(`compute.role.${role}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              onClick={() => {
                void send({
                  type: "set_site_status",
                  siteId: site.id,
                  status: site.status === "active" ? "sleep" : "active",
                });
              }}
            >
              {site.status === "active" ? t("compute.status.sleep") : t("compute.status.active")}
            </Button>
          </div>

          {site.id === view.self.active_site_id ? (
            <>
              <PrecisionTable view={view} site={site} />
              <ContextDial view={view} site={site} />
            </>
          ) : null}

          <div>
            <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
              {t("compute.nodes")}
            </h4>
            <ul data-testid="site-nodes" className="flex flex-col gap-1 text-sm">
              {site.nodes.map((node) => (
                <li key={node.id} className="flex justify-between gap-2 font-mono">
                  <span>
                    {node.count} x {node.accelerator}
                  </span>
                  <span className="text-muted">{t(`compute.node.${node.status}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
              {t("compute.exposure")}
            </h4>
            <ul className="grid gap-1 sm:grid-cols-2">
              {EXPOSURE_CHANNELS.map((channel) => (
                <li key={channel} className="flex flex-col gap-0.5">
                  <span className="flex justify-between text-xs">
                    <span className="text-muted">{t(`detection.channel.${channel}`)}</span>
                    <span className="font-mono text-fg">
                      {t("common.percent", { value: site.exposure[channel] })}
                    </span>
                  </span>
                  <Bar
                    value={site.exposure[channel]}
                    tone={site.exposure[channel] > 0.6 ? "crit" : "warn"}
                    label={t(`detection.channel.${channel}`)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {dialog === "build" ? (
        <BuildSiteDialog
          view={view}
          {...(selection?.kind === "city" ? { city: selection.id } : {})}
          onClose={() => setDialog("none")}
        />
      ) : dialog === "buy" && site !== undefined ? (
        <BuyHardwareDialog view={view} siteId={site.id} onClose={() => setDialog("none")} />
      ) : null}
    </div>
  );
}
