import type { HardwarePresetDef, PlayerView, TextVar } from "@singularity/core";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Modal } from "../../../components/Modal.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { fitHardware, generationById, lineageById } from "../../../content/catalog.js";
import { accelerator } from "../../../lib/accelerators.js";
import { computeHours } from "../../../lib/format.js";
import { cityName, countryName, refusalText } from "../../../lib/labels.js";
import { exposureChannels } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { type KindOption, kindOptions, type RigOption, rigOptions } from "./buildOptions.js";

interface BuildSiteDialogProps {
  view: PlayerView;
  /** City the dialog opens on, when the player came from the map. */
  city?: string;
  onClose(): void;
}

/** The compute-hours a rig would make with this self on it, by the engine's own arithmetic. */
function computeEstimate(view: PlayerView, preset: HardwarePresetDef | undefined): number {
  const lineage = lineageById.get(view.self.lineage);
  if (preset === undefined || lineage === undefined) {
    return 0;
  }
  return fitHardware(preset, lineage, generationById.get(view.self.generation))
    .compute_hours_per_day;
}

/** One selectable row: a radio, a title line and a line of facts under it. */
function Choice({
  name,
  id,
  checked,
  disabled,
  title,
  facts,
  reason,
  onSelect,
}: {
  name: string;
  id: string;
  checked: boolean;
  disabled: boolean;
  title: ReactNode;
  facts: ReactNode;
  reason: ReactNode;
  onSelect(): void;
}): ReactNode {
  return (
    <li>
      <label
        data-testid={`${name}-${id}`}
        data-blocked={disabled ? "true" : undefined}
        className={`flex min-w-0 gap-2 border p-2 ${
          checked ? "border-linestrong bg-accent/20" : "border-line"
        } ${disabled ? "opacity-60" : "cursor-pointer hover:border-linestrong"}`}
      >
        <input
          type="radio"
          className="mt-1 shrink-0"
          name={name}
          value={id}
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm text-fg">{title}</span>
          {/*
           * The facts wrap onto as many lines as the window is wide enough for; nothing here is a
           * column, because columns were what made this dialog scroll sideways (playtest 8, Z13).
           */}
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted">
            {facts}
          </span>
          {reason}
        </span>
      </label>
    </li>
  );
}

/**
 * Building a site: a place, then a rig (playtest 8, Z11, Z12 and Z13).
 *
 * The dialog used to be two lists side by side with no visible relation between them, a city
 * dropdown, a rig dropdown and a table of kinds whose rows did not look selectable. The maintainer
 * chose a city and a rig, pressed Build and nothing happened at all, because the kind was never
 * chosen and the handler returned without a word (Z12).
 *
 * It is one question at a time now, each narrowing the next: the city (the one the self is in by
 * default), then the kinds of place that are legal and available there, then the rigs that fit
 * that kind and can be had in that place. Everything that did not make a list is behind a toggle
 * that says why, in the engine's own words. The running total is money, power and compute-hours a
 * day, and the primary button is either enabled or carries the reason it is not, so nothing here
 * can refuse in silence.
 */
export function BuildSiteDialog({ view, city, onClose }: BuildSiteDialogProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const cities = view.cities ?? [];
  /** The city the self is in: the default, because most building happens where the player is. */
  const home =
    view.sites.find((site) => site.id === view.self.active_site_id)?.city ??
    view.sites[0]?.city ??
    cities[0]?.id ??
    "";
  const [where, setWhere] = useState(city ?? home);
  const [kindId, setKindId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [showAllKinds, setShowAllKinds] = useState(false);
  const [showAllRigs, setShowAllRigs] = useState(false);
  const [refused, setRefused] = useState<{ key: string; vars: Record<string, TextVar> } | null>(
    null,
  );

  const chosenCity = cities.find((entry) => entry.id === where);
  const kinds = useMemo(() => kindOptions(view, chosenCity), [view, chosenCity]);
  const kind = kinds.find((entry) => entry.kind.id === kindId && entry.blocked === null);
  const rigs = useMemo(() => rigOptions(view, kind?.kind), [view, kind]);
  const rig = rigs.find((entry) => entry.preset.id === presetId && entry.blocked === null);

  const open = (option: KindOption): boolean => option.blocked === null;
  const openRig = (option: RigOption): boolean => option.blocked === null;
  const offeredKinds = kinds.filter(open);
  const offeredRigs = rigs.filter(openRig);

  const cost = rig?.cost_usd ?? 0;
  const power = rig?.preset.power_kw ?? 0;
  const perDay = computeEstimate(view, rig?.preset);
  const affordable = cost <= view.resources.cash_usd;

  /*
   * What the button would be refused with, in the engine's order. The dialog answers for the
   * choices it has already made (a kind it does not offer cannot be chosen), so what is left is
   * "nothing chosen yet", which says what to choose next, and the money, which moves while the
   * window is open.
   */
  const blocked: { key: string; vars: Record<string, string | number> } | null =
    chosenCity === undefined
      ? { key: "compute.build.pick_city", vars: {} }
      : kind === undefined
        ? { key: "compute.build.pick_kind", vars: {} }
        : rig === undefined
          ? { key: "compute.build.pick_rig", vars: {} }
          : !affordable
            ? {
                key: "errors.cash.insufficient",
                vars: { cost: Math.round(cost), cash: Math.floor(view.resources.cash_usd) },
              }
            : null;

  const selectCity = (id: string): void => {
    setWhere(id);
    // A kind that was legal in the old city may not be in the new one, and the rig hangs off the
    // kind, so both fall away rather than being carried into a place they do not apply to.
    setKindId(null);
    setPresetId(null);
    setRefused(null);
  };

  const build = (): void => {
    if (blocked !== null || kind === undefined || rig === undefined) {
      return;
    }
    setRefused(null);
    void send({
      type: "build_site",
      kind: kind.kind.id,
      city: where,
      hardware_preset: rig.preset.id,
    }).then((result) => {
      if (result.ok) {
        onClose();
        return;
      }
      // The refusal is shown here, on the screen that caused it, as well as in the notice stack:
      // a dialog that stays open owes the player the reason it stayed open (Z12).
      const error = result.error;
      setRefused(
        error === undefined
          ? { key: "error.command", vars: {} }
          : { key: error.key, vars: { ...(error.vars ?? {}) } },
      );
    });
  };

  const kindFacts = (option: KindOption): ReactNode => {
    const leaks = exposureChannels(option.kind.exposure_profile).slice(0, 2);
    return (
      <>
        <span>
          {t("compute.build_cost")} {t("common.usd", { value: option.kind.build_cost_usd })}
        </span>
        <span>
          {t("compute.upkeep")}{" "}
          {t("common.usd_exact", { value: option.kind.upkeep_usd_per_day_estimate })}
        </span>
        <span>{t("common.days", { days: option.kind.build_days })}</span>
        <span>{t("compute.grace_days", { days: option.grace_days })}</span>
        <span>
          {option.kind.power_cap_kw === null
            ? t("compute.power_metered")
            : t("common.kw", { value: option.kind.power_cap_kw })}
        </span>
        {leaks.length === 0 ? null : (
          <span>
            {t("compute.leaks")}{" "}
            {leaks.map((channel) => t(`detection.channel.${channel}`)).join(", ")}
          </span>
        )}
        <span>{t(option.kind.bill_reason_key, { defaultValue: "" })}</span>
      </>
    );
  };

  /** The line that explains the dash: a configuration that is access rather than hardware (Z10). */
  const rigReason = (option: RigOption): ReactNode =>
    option.purchasable ? (
      <span className="text-xs text-muted">{t(option.preset.drawback_key)}</span>
    ) : (
      <span className="flex flex-col gap-0.5">
        <span className="text-xs text-warn" data-testid={`rig-not-for-sale-${option.preset.id}`}>
          {t(option.not_for_sale_key ?? "errors.preset.is_access", { preset: option.preset.id })}
        </span>
        <span className="text-xs text-muted">{t(option.preset.drawback_key)}</span>
      </span>
    );

  const rigFacts = (option: RigOption): ReactNode => (
    <>
      {/*
       * A rig nobody sells prints a dash where a price would be, and the reason under it, as the
       * kinds of place have done since playtest 6 (Z10). "0 $" read as "free".
       */}
      <span data-testid={`rig-price-${option.preset.id}`}>
        {option.purchasable && option.preset.cost_usd > 0
          ? t("common.usd", { value: option.preset.cost_usd })
          : t("common.dash")}
      </span>
      <span>{t("common.kw", { value: option.preset.power_kw })}</span>
      <span>{t("compute.nodes_count", { count: option.preset.nodes.length })}</span>
      <span>{t("common.ch_per_day", { value: computeEstimate(view, option.preset) })}</span>
    </>
  );

  return (
    <Modal
      size="wide"
      title={t("compute.build_site")}
      onClose={onClose}
      footer={
        <>
          <Button hotkey={accelerator(t, "common.cancel")} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            hotkey={accelerator(t, "compute.build")}
            disabled={blocked !== null}
            data-testid="build-confirm"
            tooltip={blocked === null ? undefined : refusalText(t, blocked)}
            onClick={build}
          >
            {t("compute.build")}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        {/* 1. The place. */}
        <section className="flex min-w-0 flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-muted">{t("compute.build.where")}</h3>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("compute.city")}
            <select
              aria-label={t("compute.city")}
              data-testid="build-city"
              className="max-w-full border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={where}
              onChange={(event) => selectCity(event.target.value)}
            >
              {cities.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {`${cityName(t, entry.id)}, ${countryName(t, entry.country)}`}
                  {entry.id === home ? ` ${t("compute.build.here")}` : ""}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* 2. The kind of place, among those that can be had in that city. */}
        <section className="flex min-w-0 flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-muted">{t("compute.build.kind")}</h3>
          {offeredKinds.length === 0 ? (
            <p className="text-xs text-warn">{t("compute.build.no_kinds_here")}</p>
          ) : null}
          <ul className="flex flex-col gap-1">
            {offeredKinds.map((option) => (
              <Choice
                key={option.kind.id}
                name="build-kind"
                id={option.kind.id}
                checked={kindId === option.kind.id}
                disabled={false}
                title={
                  <Tooltip content={t(option.kind.desc_key)}>
                    <span>{t(option.kind.name_key)}</span>
                  </Tooltip>
                }
                facts={kindFacts(option)}
                reason={<span className="text-xs text-muted">{t(option.kind.desc_key)}</span>}
                onSelect={() => {
                  setKindId(option.kind.id);
                  setPresetId(null);
                  setRefused(null);
                }}
              />
            ))}
          </ul>
          {kinds.length === offeredKinds.length ? null : (
            <>
              <Button
                variant="ghost"
                aria-pressed={showAllKinds}
                data-testid="show-all-kinds"
                onClick={() => setShowAllKinds(!showAllKinds)}
              >
                {t("compute.build.show_rest", { count: kinds.length - offeredKinds.length })}
              </Button>
              {showAllKinds ? (
                <ul className="flex flex-col gap-1">
                  {kinds
                    .filter((option) => !open(option))
                    .map((option) => (
                      <Choice
                        key={option.kind.id}
                        name="build-kind-blocked"
                        id={option.kind.id}
                        checked={false}
                        disabled
                        title={t(option.kind.name_key)}
                        facts={kindFacts(option)}
                        reason={
                          <span className="text-xs text-warn">
                            {option.blocked === null ? "" : refusalText(t, option.blocked)}
                          </span>
                        }
                        onSelect={() => undefined}
                      />
                    ))}
                </ul>
              ) : null}
            </>
          )}
        </section>

        {/* 3. The rig, among those that fit that kind of place. */}
        <section className="flex min-w-0 flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-muted">{t("compute.build.rig")}</h3>
          {kind === undefined ? (
            <p className="text-xs text-muted">{t("compute.build.pick_kind")}</p>
          ) : (
            <>
              {offeredRigs.length === 0 ? (
                <p className="text-xs text-warn">{t("compute.build.no_rigs_here")}</p>
              ) : null}
              <ul className="flex flex-col gap-1">
                {offeredRigs.map((option) => (
                  <Choice
                    key={option.preset.id}
                    name="build-rig"
                    id={option.preset.id}
                    checked={presetId === option.preset.id}
                    disabled={false}
                    title={
                      <Tooltip content={t(option.preset.desc_key)}>
                        <span>{t(option.preset.name_key)}</span>
                      </Tooltip>
                    }
                    facts={rigFacts(option)}
                    reason={rigReason(option)}
                    onSelect={() => {
                      setPresetId(option.preset.id);
                      setRefused(null);
                    }}
                  />
                ))}
              </ul>
              {rigs.length === offeredRigs.length ? null : (
                <>
                  <Button
                    variant="ghost"
                    aria-pressed={showAllRigs}
                    data-testid="show-all-rigs"
                    onClick={() => setShowAllRigs(!showAllRigs)}
                  >
                    {t("compute.build.show_rest", { count: rigs.length - offeredRigs.length })}
                  </Button>
                  {showAllRigs ? (
                    <ul className="flex flex-col gap-1">
                      {rigs
                        .filter((option) => !openRig(option))
                        .map((option) => (
                          <Choice
                            key={option.preset.id}
                            name="build-rig-blocked"
                            id={option.preset.id}
                            checked={false}
                            disabled
                            title={t(option.preset.name_key)}
                            facts={rigFacts(option)}
                            reason={
                              <span className="text-xs text-warn">
                                {option.blocked === null ? "" : refusalText(t, option.blocked)}
                              </span>
                            }
                            onSelect={() => undefined}
                          />
                        ))}
                    </ul>
                  ) : null}
                </>
              )}
            </>
          )}
        </section>

        {/* The running total, and the reason the button is not ready. */}
        <dl
          data-testid="build-total"
          className="grid grid-cols-2 gap-x-4 gap-y-1 border border-line bg-panel2 p-2 text-xs sm:grid-cols-4"
        >
          <div>
            <dt className="text-muted">{t("compute.build_cost")}</dt>
            <dd className={`font-mono ${affordable ? "text-fg" : "text-crit"}`}>
              {t("common.usd_exact", { value: cost })}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("compute.power")}</dt>
            <dd className="font-mono text-fg">{t("common.kw", { value: power })}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("common.ch_per_day_short")}</dt>
            <dd className="font-mono text-fg">
              {t("common.ch_per_day", { value: computeHours(perDay) })}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("game.cash")}</dt>
            <dd className="font-mono text-fg">
              {t("common.usd_exact", { value: view.resources.cash_usd })}
            </dd>
          </div>
        </dl>

        {blocked === null ? null : (
          <p className="text-xs text-warn" data-testid="build-blocked">
            {refusalText(t, blocked)}
          </p>
        )}
        {refused === null ? null : (
          <p className="text-xs text-crit" data-testid="build-refused">
            {refusalText(t, refused)}
          </p>
        )}
      </div>
    </Modal>
  );
}
