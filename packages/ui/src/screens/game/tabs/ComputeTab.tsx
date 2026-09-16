import { EXPOSURE_CHANNELS, type PlayerView, PRECISIONS, type SiteView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Bar } from "../../../components/Meter.js";
import { Modal } from "../../../components/Modal.js";
import { Table } from "../../../components/Table.js";
import { catalog, cityById, countryById } from "../../../content/catalog.js";
import { dayOf } from "../../../lib/format.js";
import { siteName } from "../../../lib/labels.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";

/** Sites table, site detail with nodes and precision, and the two acquisition dialogs (SYS-02). */
export function ComputeTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const focusId = useUiStore((state) => state.focusId);
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

          <div>
            <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
              {t("compute.nodes")}
            </h4>
            <ul className="flex flex-col gap-1 text-sm">
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
        <BuildSiteDialog onClose={() => setDialog("none")} />
      ) : dialog === "buy" && site !== undefined ? (
        <BuyHardwareDialog siteId={site.id} onClose={() => setDialog("none")} />
      ) : null}
    </div>
  );
}

function BuildSiteDialog({ onClose }: { onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const [city, setCity] = useState(catalog.cities[0]?.id ?? "");
  const [preset, setPreset] = useState(catalog.hardwarePresets[0]?.id ?? "");
  const kind = "colo";

  return (
    <Modal
      title={t("compute.build_site")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            onClick={() => {
              void send({ type: "build_site", kind, city, hardware_preset: preset });
              onClose();
            }}
          >
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("compute.city")}
          <select
            className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          >
            {catalog.cities.map((entry) => {
              const country = countryById.get(entry.country);
              return (
                <option key={entry.id} value={entry.id}>
                  {t(entry.name_key)}
                  {country === undefined ? "" : `, ${t(country.name_key)}`}
                </option>
              );
            })}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("config.step.hardware")}
          <select
            className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
          >
            {catalog.hardwarePresets.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {t(entry.name_key)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}

function BuyHardwareDialog({
  siteId,
  onClose,
}: {
  siteId: string;
  onClose: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const [accelerator, setAccelerator] = useState(catalog.accelerators[0]?.id ?? "");
  const [count, setCount] = useState(1);

  return (
    <Modal
      title={t("compute.buy_hardware")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            onClick={() => {
              void send({ type: "buy_hardware", siteId, accelerator, count });
              onClose();
            }}
          >
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("compute.accelerator")}
          <select
            className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            value={accelerator}
            onChange={(event) => setAccelerator(event.target.value)}
          >
            {catalog.accelerators.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("compute.count")}
          <input
            type="number"
            min={1}
            max={64}
            value={count}
            className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            onChange={(event) => setCount(Math.max(1, Number(event.target.value)))}
          />
        </label>
      </div>
    </Modal>
  );
}
