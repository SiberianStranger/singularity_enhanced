import {
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type PlayerView,
  type SiteView,
} from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { EquipmentDialog } from "../dialogs/EquipmentDialog.js";

/** Six functional subsystems, with orders kept separate from installed equipment. */
export function SiteEquipmentPanel({
  view,
  site,
}: {
  view: PlayerView;
  site: SiteView;
}): ReactNode {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<EquipmentSlot | null>(null);
  const equipment = site.equipment;
  if (equipment === undefined) {
    return null;
  }
  const capacity = (value: number | null): string =>
    value === null
      ? t("equipment_ui.capacity_unspecified")
      : t("common.kw", { value: Math.round(value * 10) / 10 });
  const fact = (slot: EquipmentSlot): string => {
    switch (slot) {
      case "compute":
        return t("equipment_ui.compute_fact", {
          memory: t("common.gb", { value: Math.round(site.memory_gb) }),
          compute: t("common.ch_per_day", { value: Math.round(site.compute_hours_per_day) }),
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
        return equipment.network_egress
          ? equipment.network_mbps === null
            ? t("equipment_ui.network_available")
            : t("equipment_ui.network_fact", { value: equipment.network_mbps })
          : t("equipment_ui.network_offline");
      case "interconnect":
        return t("equipment_ui.interconnect_fact", { tier: equipment.interconnect_tier });
      case "security":
        return t("equipment_ui.security_fact");
    }
  };
  return (
    <section className="flex min-w-0 flex-col gap-2" data-testid="site-equipment">
      <h4 className="text-xs uppercase tracking-wide text-muted">{t("equipment_ui.subsystems")}</h4>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {EQUIPMENT_SLOTS.map((slot) => {
          const installed = equipment.slots.find((entry) => entry.id === slot);
          return (
            <section
              key={slot}
              data-testid={`equipment-slot-${slot}`}
              className="flex min-w-0 flex-col items-start gap-1 border border-line bg-panel2 p-2"
            >
              <h5 className="text-xs font-semibold">{t(`equipment_ui.slot.${slot}`)}</h5>
              <p className="break-words text-sm">
                {installed?.installed_keys !== undefined && installed.installed_keys.length > 0
                  ? installed.installed_keys.map((key) => t(key)).join("; ")
                  : t(installed?.installed_key ?? "equipment_ui.existing")}
              </p>
              <p className="text-xs text-muted">{fact(slot)}</p>
              {installed?.managed ? (
                <p className="text-xs text-muted">{t("equipment_ui.managed")}</p>
              ) : null}
              <Button
                variant="ghost"
                className="mt-auto max-w-full whitespace-normal text-xs"
                aria-label={t("equipment_ui.configure_slot", {
                  slot: t(`equipment_ui.slot.${slot}`),
                })}
                onClick={() => setDialog(slot)}
              >
                {t("equipment_ui.options")}
              </Button>
            </section>
          );
        })}
      </div>
      {equipment.orders.length === 0 ? null : (
        <div className="flex flex-col gap-1 border border-line p-2" data-testid="equipment-orders">
          <h5 className="text-xs font-semibold">{t("equipment_ui.orders")}</h5>
          <ul className="flex flex-col gap-2">
            {equipment.orders.map((order) => (
              <li key={order.id} className="flex min-w-0 flex-col gap-0.5 text-xs">
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
        </div>
      )}
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
