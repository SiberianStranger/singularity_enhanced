import type { OperationView, PlayerView } from "@singularity/core";
import { TICKS_PER_DAY } from "@singularity/core";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { EffectList } from "../../../components/EffectList.js";
import { Bar } from "../../../components/Meter.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { computeHours, dayOf, days, fraction } from "../../../lib/format.js";
import { computeLedger } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";

/**
 * What an operation still has to wait through, in the units the player reads (playtest 8, Z6).
 *
 * The panel used to show a percentage and a bar, and a percentage rounds: a forty-day operation
 * with four hours to run prints "100% done" and sits there, which is what the maintainer saw. The
 * remaining time is the honest figure, so it is the one next to the name; hours below a day,
 * whole days above it.
 */
export function remainingText(t: TFunction, view: PlayerView, operation: OperationView): string {
  const hours = Math.max(0, operation.ends_tick - view.tick);
  if (hours <= 0) {
    return t("operations.finishing");
  }
  return hours < TICKS_PER_DAY
    ? t("operations.remaining_hours", { hours })
    : t("operations.remaining_days", { days: days(hours / TICKS_PER_DAY) });
}

/**
 * Offers by category with what each one costs, what it can do and why it cannot be started
 * (SYS-17; playtest 1, C7).
 *
 * Start does send the command now, and a refusal becomes a toast with the engine's reason; an offer
 * that is already known to be blocked is greyed with that reason in its tooltip, so the player does
 * not have to press it to find out.
 */
export function OperationsTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const reserved = computeLedger(view).reservations;
  const byCategory = new Map<string, PlayerView["operation_offers"]>();
  for (const offer of view.operation_offers) {
    byCategory.set(offer.category, [...(byCategory.get(offer.category) ?? []), offer]);
  }

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("operations.running")}
        </h3>
        {view.operations.length === 0 ? (
          <p className="text-sm text-muted">{t("outliner.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.operations.map((operation) => {
              const elapsed = view.tick - operation.started_tick;
              const span = operation.ends_tick - operation.started_tick;
              const left = Math.max(0, operation.ends_tick - view.tick);
              // A bar that reads full while hours remain is the finding itself (Z6): the fraction
              // is held one step short of the end until the operation actually ends.
              const progress = left > 0 ? Math.min(0.99, fraction(elapsed, span)) : 1;
              const held = reserved.find((line) => line.instance_id === operation.instance_id);
              return (
                <li key={operation.instance_id} className="border border-line bg-panel p-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-fg">
                      {t(`operations.${operation.operation_id}.name`)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs text-fg"
                        data-testid={`operation-left-${operation.instance_id}`}
                      >
                        {remainingText(t, view, operation)}
                      </span>
                      <Button
                        variant="danger"
                        onClick={() => {
                          void send({
                            type: "abort_operation",
                            instanceId: operation.instance_id,
                          });
                        }}
                      >
                        {t("operations.abort")}
                      </Button>
                    </span>
                  </div>
                  <Bar value={progress} className="mt-1" label={t("operations.running")} />
                  {/*
                   * What it is actually waiting for. An operation runs for a span the engine drew
                   * when it started, and nothing the player does now shortens it: the compute it
                   * holds is a reservation for as long as it runs, not a rate that finishes it
                   * sooner. Both lines say so, and the second is also where the compute in the
                   * Compute tab's subtraction went (Z2).
                   */}
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span>{t("operations.ends_on", { day: dayOf(operation.ends_tick) })}</span>
                    <span>{t("operations.fixed_run", { days: days(span / TICKS_PER_DAY) })}</span>
                    {held === undefined || held.ch_per_day <= 0 ? null : (
                      <span data-testid={`operation-holds-${operation.instance_id}`}>
                        {t("operations.holds", { value: computeHours(held.ch_per_day) })}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-wide text-muted">{t("operations.offers")}</h3>
        {view.operation_offers.length === 0 ? (
          <p className="text-sm text-muted">{t("operations.empty")}</p>
        ) : null}
        {[...byCategory.entries()].map(([category, offers]) => (
          <div key={category} className="flex flex-col gap-2">
            <h4 className="text-xs text-muted">{t(`operations.category.${category}`)}</h4>
            <ul className="flex flex-col gap-2">
              {offers.map((offer) => {
                const reason =
                  offer.blocked_reason ?? offer.blocked_by[0] ?? "requirements.unknown";
                return (
                  <li
                    key={offer.id}
                    data-testid={`offer-${offer.id}`}
                    className="border border-line bg-panel p-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Tooltip content={t(offer.desc_key)}>
                        <span className="text-sm text-fg">{t(offer.name_key)}</span>
                      </Tooltip>
                      <Button
                        variant="primary"
                        disabled={!offer.enabled}
                        tooltip={
                          <span className="flex flex-col gap-1">
                            <EffectList
                              effects={offer.effects_on_success}
                              title={t("operations.on_success")}
                            />
                            <EffectList
                              effects={offer.effects_on_failure}
                              title={t("operations.on_failure")}
                            />
                            {offer.enabled ? null : (
                              <span className="text-warn">
                                {t("operations.blocked")} {t(reason)}
                              </span>
                            )}
                          </span>
                        }
                        onClick={() => {
                          void send({ type: "start_operation", operationId: offer.id });
                        }}
                      >
                        {t("operations.start")}
                      </Button>
                    </div>
                    <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                      <span>
                        {t("operations.duration", {
                          min: days(offer.duration_min_days),
                          max: days(offer.duration_max_days),
                        })}
                      </span>
                      <span>{t("operations.attention", { value: offer.cost_attention })}</span>
                      {offer.cost_usd > 0 ? (
                        <span>{t("operations.cost_usd", { value: offer.cost_usd })}</span>
                      ) : null}
                      <span>{t("operations.success", { value: offer.success_chance })}</span>
                    </p>
                    {offer.enabled ? null : (
                      <p className="text-xs text-warn">
                        {t("operations.blocked")} {t(reason)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
