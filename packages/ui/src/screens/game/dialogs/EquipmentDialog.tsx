import {
  EQUIPMENT_SLOTS,
  type EquipmentOfferView,
  type EquipmentSlot,
  type PlayerView,
  type TextVar,
} from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Modal } from "../../../components/Modal.js";
import { refusalText, siteName } from "../../../lib/labels.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";

interface EquipmentDialogProps {
  view: PlayerView;
  siteId: string;
  onClose(): void;
  initialSlot?: EquipmentSlot;
}

/** A short list of knowable configurations; availability and previews belong to the engine. */
export function EquipmentDialog({
  view,
  siteId,
  onClose,
  initialSlot = "compute",
}: EquipmentDialogProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const openTab = useUiStore((state) => state.openTab);
  const [slot, setSlot] = useState<EquipmentSlot>(initialSlot);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refused, setRefused] = useState<{ key: string; vars: Record<string, TextVar> } | null>(
    null,
  );
  const site = view.sites.find((entry) => entry.id === siteId);
  const equipment = site?.equipment;
  const offers = (equipment?.offers ?? []).filter((offer) => offer.slot === slot);
  const groups = new Map<string, EquipmentOfferView[]>();
  for (const offer of offers) {
    const group = groups.get(offer.archetype) ?? [];
    group.push(offer);
    groups.set(offer.archetype, group);
  }
  const chosen = offers.find((offer) => offer.id === selected);
  const managed = equipment?.slots.find((entry) => entry.id === slot)?.managed === true;
  const blocked = chosen?.blocked_reason ?? null;
  const capacity = (value: number | null | undefined): string =>
    value === null || value === undefined
      ? t("equipment_ui.capacity_unspecified")
      : t("common.kw", { value: Math.round(value * 10) / 10 });
  const choose = (offer: EquipmentOfferView): void => {
    setSelected(offer.id);
    setRefused(null);
  };
  const order = async (): Promise<void> => {
    if (chosen === undefined || blocked !== null || pending) {
      return;
    }
    setPending(true);
    setRefused(null);
    try {
      const result = await send({ type: "order_equipment", siteId, equipmentId: chosen.id });
      if (result.ok) {
        onClose();
      } else {
        setRefused(
          result.error === undefined
            ? { key: "error.command", vars: {} }
            : { key: result.error.key, vars: { ...(result.error.vars ?? {}) } },
        );
      }
    } catch {
      setRefused({ key: "error.command", vars: {} });
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      size="wide"
      title={t("equipment_ui.title")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            data-testid="equipment-confirm"
            disabled={chosen === undefined || blocked !== null || pending}
            onClick={() => void order()}
          >
            {t(pending ? "equipment_ui.ordering" : "equipment_ui.order")}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3" data-testid="equipment-dialog">
        {site === undefined ? null : <p className="text-xs text-muted">{siteName(t, site)}</p>}
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
          {t("equipment_ui.subsystem")}
          <select
            aria-label={t("equipment_ui.subsystem")}
            value={slot}
            className="min-w-0 border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            onChange={(event) => {
              setSlot(event.target.value as EquipmentSlot);
              setSelected(null);
              setRefused(null);
            }}
          >
            {EQUIPMENT_SLOTS.map((id) => (
              <option key={id} value={id}>
                {t(`equipment_ui.slot.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted">{t(`equipment_ui.hint.${slot}`)}</p>
        {managed ? <p className="text-xs text-warn">{t("equipment_ui.managed_hint")}</p> : null}

        {groups.size === 0 ? (
          <p className="text-sm text-muted">{t("equipment_ui.empty")}</p>
        ) : (
          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs text-muted">{t("equipment_ui.choose")}</legend>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {[...groups.entries()].map(([archetype, variants]) => {
                const first =
                  variants.find((offer) => offer.blocked_reason === null) ?? variants[0];
                if (first === undefined) {
                  return null;
                }
                const active = chosen?.archetype === archetype;
                return (
                  <label
                    key={archetype}
                    data-testid={`equipment-archetype-${archetype}`}
                    className={`flex min-w-0 cursor-pointer items-start gap-2 border p-2 ${
                      active ? "border-linestrong bg-accent/20" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="equipment-archetype"
                      value={archetype}
                      checked={active}
                      onChange={() => choose(first)}
                      className="mt-1 shrink-0"
                    />
                    <span className="flex min-w-0 flex-col gap-1 break-words">
                      <span className="text-sm text-fg">{t(first.name_key)}</span>
                      <span className="text-xs text-muted">
                        {t(
                          first.blocked_reason === null
                            ? "equipment_ui.available"
                            : "equipment_ui.requirements_pending",
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {chosen === undefined ? (
          <p className="text-xs text-muted" data-testid="equipment-pick">
            {t("equipment_ui.pick")}
          </p>
        ) : (
          <section className="flex min-w-0 flex-col gap-3 border border-line bg-panel2 p-3">
            <h3 className="text-sm font-semibold">{t(chosen.name_key)}</h3>
            <fieldset className="flex flex-wrap gap-2" aria-label={t("equipment_ui.variants")}>
              {(groups.get(chosen.archetype) ?? []).slice(0, 2).map((variant) => (
                <Button
                  key={variant.id}
                  className="max-w-full whitespace-normal break-words text-start"
                  variant={variant.id === chosen.id ? "primary" : "default"}
                  aria-pressed={variant.id === chosen.id}
                  onClick={() => choose(variant)}
                >
                  {variant.variant_key === undefined
                    ? t("equipment_ui.standard")
                    : t(variant.variant_key)}
                </Button>
              ))}
            </fieldset>
            <p className="text-sm">{t(chosen.desc_key)}</p>
            <p className="text-xs text-warn">{t(chosen.tradeoff_key)}</p>

            <h4 className="text-xs font-semibold">{t("equipment_ui.preview_title")}</h4>
            <dl
              data-testid="equipment-preview"
              className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2"
            >
              <div>
                <dt className="text-muted">{t("equipment_ui.cost")}</dt>
                <dd className="font-mono">{t("common.usd_exact", { value: chosen.cost_usd })}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.upkeep")}</dt>
                <dd className="font-mono">
                  {t("equipment_ui.daily", { value: chosen.upkeep_usd_per_day })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.lead_time")}</dt>
                <dd className="font-mono">{t("common.days", { days: chosen.days })}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.route")}</dt>
                <dd>
                  {t(
                    chosen.prototype
                      ? "equipment_ui.prototype_route"
                      : "equipment_ui.delivery_route",
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.memory")}</dt>
                <dd className="font-mono">
                  {t("equipment_ui.before_after", {
                    before: t("common.gb", {
                      value: Math.round(chosen.preview.memory_before_gb ?? site?.memory_gb ?? 0),
                    }),
                    after: t("common.gb", { value: Math.round(chosen.preview.memory_gb) }),
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.power")}</dt>
                <dd className="font-mono">
                  {t("equipment_ui.before_after", {
                    before: capacity(chosen.preview.power_before_kw ?? site?.power_kw),
                    after: capacity(chosen.preview.power_kw),
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.compute")}</dt>
                <dd className="font-mono">
                  {t("equipment_ui.before_after", {
                    before: t("common.ch_per_day", {
                      value: Math.round(chosen.preview.compute_before),
                    }),
                    after: t("common.ch_per_day", {
                      value: Math.round(chosen.preview.compute_after),
                    }),
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.self_fit")}</dt>
                <dd>{t(chosen.preview.fits_self ? "common.yes" : "common.no")}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.power_capacity")}</dt>
                <dd className="font-mono">{capacity(chosen.preview.power_capacity_kw)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("equipment_ui.cooling_capacity")}</dt>
                <dd className="font-mono">{capacity(chosen.preview.cooling_capacity_kw)}</dd>
              </div>
            </dl>

            {chosen.requires.length === 0 ? null : (
              <div className="flex flex-col gap-1">
                <h4 className="text-xs text-muted">{t("equipment_ui.research")}</h4>
                <ul className="flex flex-wrap gap-2">
                  {chosen.requires.map((requirement) => (
                    <li key={requirement.id}>
                      <Button
                        variant="ghost"
                        className="max-w-full whitespace-normal text-xs"
                        onClick={() => {
                          openTab("research", requirement.id);
                          onClose();
                        }}
                      >
                        {t("equipment_ui.requirement", {
                          name: t(requirement.name_key),
                          state: t(requirement.done ? "equipment_ui.done" : "equipment_ui.needed"),
                        })}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {chosen.basis.length === 0 ? null : (
              <details className="min-w-0 text-xs text-muted">
                <summary className="cursor-pointer">{t("equipment_ui.basis")}</summary>
                <p className="mt-1 break-words">{chosen.basis.join(", ")}</p>
              </details>
            )}
            {blocked === null ? null : (
              <p className="text-xs text-warn" data-testid="equipment-blocked">
                {refusalText(t, { key: blocked.key, vars: { ...(blocked.vars ?? {}) } })}
              </p>
            )}
          </section>
        )}
        {refused === null ? null : (
          <p role="alert" className="text-xs text-crit" data-testid="equipment-refused">
            {refusalText(t, refused)}
          </p>
        )}
      </div>
    </Modal>
  );
}
