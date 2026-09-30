import {
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type PlayerView,
  type SiteView,
} from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Glyph, type GlyphName } from "../../../components/glyphs.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { EquipmentDialog } from "../dialogs/EquipmentDialog.js";

const ICONS: Record<EquipmentSlot, GlyphName> = {
  compute: "compute",
  power: "power",
  cooling: "cooling",
  network: "network",
  interconnect: "interconnect",
  security: "security",
};
/** Six readable equipment rows; the surrounding site window owns navigation and summary. */
export function SiteEquipmentPanel({
  view,
  site,
  onConfigure,
}: {
  view: PlayerView;
  site: SiteView;
  onConfigure?(slot: EquipmentSlot): void;
}): ReactNode {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<EquipmentSlot | null>(null);
  const equipment = site.equipment;
  if (equipment === undefined) return null;
  const capacity = (value: number | null): string =>
    value === null
      ? t("equipment_ui.capacity_unspecified")
      : t("common.kw", { value: Math.round(value * 10) / 10 });
  const fact = (slot: EquipmentSlot): string => {
    switch (slot) {
      case "compute":
        return t("equipment_ui.compute_fact", {
          memory: t("common.gb", { value: Math.round(site.memory_gb) }),
          compute: t("common.ch_per_day", {
            value: Math.round(site.compute_hours_per_day * 10) / 10,
          }),
        });
      case "power":
        return t("equipment_ui.power_fact", {
          used: capacity(site.power_kw),
          capacity: capacity(equipment.power_capacity_kw),
        });
      case "cooling":
        return t("equipment_ui.cooling_fact", {
          capacity: capacity(equipment.cooling_capacity_kw),
        });
      case "network":
        return !equipment.network_egress
          ? t("equipment_ui.network_offline")
          : equipment.network_mbps === null
            ? t("equipment_ui.network_available")
            : t("equipment_ui.network_fact", { value: equipment.network_mbps });
      case "interconnect":
        return t("equipment_ui.interconnect_fact", { tier: equipment.interconnect_tier });
      case "security":
        return t("equipment_ui.security_fact");
    }
  };
  /*
   * A site the host runs whole (the self's own machine room) has all six subsystems managed. The
   * tag is then said once, beside the heading, rather than six times down the rows, which made
   * each Russian row a line taller and pushed the sixth below a 720 px window.
   */
  const allManaged = EQUIPMENT_SLOTS.every(
    (slot) => equipment.slots.find((entry) => entry.id === slot)?.managed === true,
  );
  return (
    <section className="flex min-w-0 flex-col gap-2" data-testid="site-equipment">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-xs uppercase tracking-wide text-muted">
          {t("equipment_ui.subsystems")}
        </h4>
        {allManaged ? (
          <Tooltip content={t("equipment_ui.managed_hint")}>
            <span
              className="border border-line/70 px-1 text-xs text-muted"
              data-testid="equipment-managed-all"
            >
              {t("equipment_ui.managed")}
            </span>
          </Tooltip>
        ) : null}
      </div>
      {/*
       * Six rows, one per subsystem, as the original listed a base's slots one per line (the
       * maintainer's request: rows, not a two-by-three grid of tiles). The slot's name, what is
       * installed and the fact that matters about it, and the button that opens the workshop on
       * that slot. A subsystem the host runs says so in the same line and offers a look instead.
       */}
      <div className="min-w-0 border border-line">
        {EQUIPMENT_SLOTS.map((slot) => {
          const installed = equipment.slots.find((entry) => entry.id === slot);
          const names =
            (installed?.installed_keys?.length ?? 0) > 0
              ? (installed?.installed_keys ?? []).map((key) => t(key))
              : [t(installed?.installed_key ?? "equipment_ui.existing")];
          const shown =
            names.length > 2
              ? `${names.slice(0, 2).join("; ")}; ${t("site_ui.more_configurations", { count: names.length - 2 })}`
              : names.join("; ");
          return (
            <section
              key={slot}
              data-testid={`equipment-slot-${slot}`}
              className="grid min-w-0 grid-cols-[1.25rem_minmax(9.5rem,0.75fr)_minmax(0,1.6fr)_auto] items-center gap-x-2 border-b border-line/60 px-2 py-1.5 last:border-b-0"
            >
              <Glyph name={ICONS[slot]} size={20} className="text-muted" />
              <h5 className="min-w-0 break-words text-xs">{t(`equipment_ui.slot.${slot}`)}</h5>
              <div className="flex min-w-0 flex-col">
                <Tooltip className="max-w-full" content={names.join("; ")}>
                  <span className="min-w-0 break-words text-sm leading-snug">{shown}</span>
                </Tooltip>
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs text-muted">
                  <span className="min-w-0 break-words">{fact(slot)}</span>
                  {installed?.managed && !allManaged ? (
                    <span className="border border-line/70 px-1">{t("equipment_ui.managed")}</span>
                  ) : null}
                </span>
              </div>
              <Button
                variant="ghost"
                className="max-w-full whitespace-normal text-xs"
                data-testid={`equipment-change-${slot}`}
                aria-label={t("equipment_ui.configure_slot", {
                  slot: t(`equipment_ui.slot.${slot}`),
                })}
                tooltip={installed?.managed ? t("equipment_ui.managed_hint") : undefined}
                onClick={() => (onConfigure === undefined ? setDialog(slot) : onConfigure(slot))}
              >
                {t(installed?.managed ? "site_ui.view" : "site_ui.change")}
              </Button>
            </section>
          );
        })}
      </div>
      {equipment.orders.length > 0 ? (
        <section className="border border-line p-2" data-testid="equipment-orders">
          <h5 className="mb-1 text-xs">{t("equipment_ui.orders")}</h5>
          <ul className="flex flex-col gap-1">
            {equipment.orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs"
              >
                <span>{t(order.name_key)}</span>
                <span className="text-muted">
                  {t("equipment_ui.order_status", {
                    phase: t(`equipment_ui.phase.${order.phase}`),
                    days: Math.ceil(order.remaining_days * 10) / 10,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {dialog === null ? null : (
        <EquipmentDialog
          view={view}
          siteId={site.id}
          initialSlot={dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
