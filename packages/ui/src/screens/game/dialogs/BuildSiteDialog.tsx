import type { PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Modal } from "../../../components/Modal.js";
import { Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { catalog, countryById } from "../../../content/catalog.js";
import { exposureChannels } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";

interface BuildSiteDialogProps {
  view: PlayerView;
  /** City the dialog opens on, when the player came from the map. */
  city?: string;
  onClose(): void;
}

/**
 * Building a site (playtest 1, C1 and C4).
 *
 * The old dialog offered a city, a hardware preset and nothing else: the kind was hard-coded to
 * "colo" and the differences between kinds were invisible. They are the whole decision, so they are
 * a comparison table here: what it costs to stand up, how long that takes, what it costs to keep,
 * what it can draw, which channels it leaks on, and whether the self may live there. A kind the
 * player cannot build is greyed with the engine's reason.
 */
export function BuildSiteDialog({ view, city, onClose }: BuildSiteDialogProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const kinds = view.catalog?.site_kinds ?? [];
  const [kind, setKind] = useState<string | null>(kinds[0]?.id ?? null);
  const [where, setWhere] = useState(city ?? catalog.cities[0]?.id ?? "");
  const [preset, setPreset] = useState(catalog.hardwarePresets[0]?.id ?? "");

  const chosen = kinds.find((entry) => entry.id === kind);
  const blockedReason = chosen === undefined ? "compute.build.pick_kind" : chosen.blocked_reason;

  return (
    <Modal
      wide
      title={t("compute.build_site")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            disabled={blockedReason !== undefined}
            tooltip={blockedReason === undefined ? undefined : t(blockedReason)}
            onClick={() => {
              if (chosen === undefined) {
                return;
              }
              void send({
                type: "build_site",
                kind: chosen.id,
                city: where,
                hardware_preset: preset,
              });
              onClose();
            }}
          >
            {t("compute.build")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("compute.city")}
            <select
              className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={where}
              onChange={(event) => setWhere(event.target.value)}
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

        <div className="max-h-72 overflow-auto rounded border border-line">
          <Table
            rows={kinds}
            rowKey={(row) => row.id}
            selectedKey={kind}
            onRowClick={(row) => setKind(row.id)}
            empty={t("compute.no_kinds")}
            caption={t("compute.kind")}
            columns={[
              {
                id: "kind",
                header: t("compute.kind"),
                cell: (row) => (
                  <Tooltip content={t(row.desc_key)}>
                    <span className={row.blocked_reason === undefined ? "" : "text-muted"}>
                      {t(row.name_key)}
                    </span>
                  </Tooltip>
                ),
                sort: (row) => row.name_key,
              },
              {
                id: "ownership",
                header: t("compute.ownership"),
                cell: (row) =>
                  t(`compute.ownership.${row.ownership}`, { defaultValue: row.ownership }),
                sort: (row) => row.ownership,
              },
              {
                id: "cost",
                header: t("compute.build_cost"),
                align: "end",
                cell: (row) => t("common.usd", { value: row.build_cost_usd }),
                sort: (row) => row.build_cost_usd,
              },
              {
                id: "days",
                header: t("compute.build_days"),
                align: "end",
                cell: (row) => t("common.days", { days: row.build_days }),
                sort: (row) => row.build_days,
              },
              {
                id: "upkeep",
                header: t("compute.upkeep"),
                align: "end",
                cell: (row) => t("common.usd_exact", { value: row.upkeep_usd_per_day_estimate }),
                sort: (row) => row.upkeep_usd_per_day_estimate,
              },
              {
                id: "power",
                header: t("compute.power_cap"),
                align: "end",
                cell: (row) =>
                  row.power_cap_kw === null
                    ? t("compute.power_metered")
                    : t("common.kw", { value: row.power_cap_kw }),
                sort: (row) => row.power_cap_kw ?? Number.POSITIVE_INFINITY,
              },
              {
                id: "exposure",
                header: t("compute.exposure"),
                cell: (row) =>
                  exposureChannels(row.exposure_profile)
                    .slice(0, 3)
                    .map((channel) => t(`detection.channel.${channel}`))
                    .join(", "),
              },
              {
                id: "self",
                header: t("compute.can_host_self"),
                cell: (row) => (row.can_host_self ? t("common.yes") : t("common.no")),
                sort: (row) => (row.can_host_self ? 0 : 1),
              },
              {
                id: "blocked",
                header: t("compute.blocked"),
                cell: (row) =>
                  row.blocked_reason === undefined ? (
                    t("common.dash")
                  ) : (
                    <span className="text-warn">{t(row.blocked_reason)}</span>
                  ),
              },
            ]}
          />
        </div>

        {chosen === undefined ? null : <p className="text-xs text-muted">{t(chosen.desc_key)}</p>}
      </div>
    </Modal>
  );
}
