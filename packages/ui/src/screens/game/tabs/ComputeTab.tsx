import { EXPOSURE_CHANNELS, type PlayerView, PRECISIONS, type SiteView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Bar } from "../../../components/Meter.js";
import { Table } from "../../../components/Table.js";
import { cityById } from "../../../content/catalog.js";
import { dayOf } from "../../../lib/format.js";
import { siteName } from "../../../lib/labels.js";
import { precisionRows } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";
import { BuildSiteDialog } from "../dialogs/BuildSiteDialog.js";
import { BuyHardwareDialog } from "../dialogs/BuyHardwareDialog.js";

/**
 * What raising the precision buys and what it costs, in one table (playtest 1, C3).
 *
 * The playtest's complaint was exact: raising the precision lowers the compute, so why raise it?
 * Because the copy is more capable. Both halves of that trade are columns here, next to the memory
 * the precision needs and whether the site has it, so the answer is read rather than deduced.
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
              <span className={row.is_current ? "font-semibold text-accent" : ""}>
                {t(`precision.${row.precision}`)}
                {row.is_current ? ` ${t("compute.precision_current")}` : ""}
              </span>
            ),
          },
          {
            id: "memory",
            header: t("compute.memory"),
            align: "end",
            cell: (row) => t("common.gb", { value: Math.round(row.memory_gb) }),
          },
          {
            id: "fits",
            header: t("compute.fits"),
            cell: (row) => (
              <span className={row.fits ? "text-ok" : "text-crit"}>
                {row.fits ? t("common.yes") : t("common.no")}
              </span>
            ),
          },
          {
            id: "capability",
            header: t("compute.capability_factor"),
            align: "end",
            cell: (row) => t("common.percent", { value: row.capability_factor }),
          },
          {
            id: "compute",
            header: t("game.compute"),
            align: "end",
            cell: (row) => t("common.ch_per_day", { value: Math.round(row.compute_hours_per_day) }),
          },
          {
            id: "research",
            header: t("compute.effective_research"),
            align: "end",
            cell: (row) =>
              t("common.ch_per_day", { value: Math.round(row.effective_research_per_day) }),
          },
          {
            id: "income",
            header: t("compute.effective_income"),
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
  );
}

/** Sites table, site detail with nodes and precision, and the two acquisition dialogs (SYS-02). */
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setDialog("build")}>
          {t("compute.build_site")}
        </Button>
        <Button
          disabled={site === undefined}
          tooltip={site === undefined ? t("compute.empty") : undefined}
          onClick={() => setDialog("buy")}
        >
          {t("compute.buy_hardware")}
        </Button>
      </div>

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
            cell: (row) => siteName(t, row),
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
            id: "role",
            header: t("compute.role"),
            cell: (row) => t(`compute.role.${row.role}`),
            sort: (row) => row.role,
          },
          {
            id: "memory",
            header: t("compute.memory"),
            align: "end",
            cell: (row) => t("common.gb", { value: Math.round(row.memory_gb) }),
            sort: (row) => row.memory_gb,
          },
          {
            id: "compute",
            header: t("game.compute"),
            align: "end",
            cell: (row) => t("common.ch_per_day", { value: Math.round(row.compute_hours_per_day) }),
            sort: (row) => row.compute_hours_per_day,
          },
          {
            id: "upkeep",
            header: t("compute.upkeep"),
            align: "end",
            cell: (row) => t("common.usd_exact", { value: row.upkeep_usd_per_day }),
            sort: (row) => row.upkeep_usd_per_day,
          },
        ]}
      />

      {site === undefined ? null : (
        <section className="flex flex-col gap-3 rounded border border-line bg-panel p-3">
          <h3 className="text-sm font-semibold text-fg">{siteName(t, site)}</h3>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span>
              {t("compute.power")}: {t("common.kw", { value: site.power_kw })}
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
              <select
                className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
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
                className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
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

          {site.id === view.self.active_site_id ? <PrecisionTable view={view} site={site} /> : null}

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
