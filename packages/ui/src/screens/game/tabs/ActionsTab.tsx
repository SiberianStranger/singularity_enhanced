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
import { reasonText } from "../../../lib/labels.js";
import { computeLedger } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";

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

function Heading({ children }: { children: ReactNode }): ReactNode {
  return <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">{children}</h3>;
}

/** The operations under way: what each is waiting for and what it holds (SYS-17, Z6). */
function RunningOperations({ view, focusId }: { view: PlayerView; focusId: string | null }) {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const reserved = computeLedger(view).reservations;
  return (
    <section data-testid="actions-running">
      <Heading>{t("actions.running")}</Heading>
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
              <li
                key={operation.instance_id}
                data-testid={`operation-${operation.instance_id}`}
                className={`border bg-panel p-2 ${
                  operation.instance_id === focusId ? "border-linestrong" : "border-line"
                }`}
              >
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
                        void send({ type: "abort_operation", instanceId: operation.instance_id });
                      }}
                    >
                      {t("operations.abort")}
                    </Button>
                  </span>
                </div>
                <Bar value={progress} className="mt-1" label={t("actions.running")} />
                {/*
                 * What it is actually waiting for. An operation runs for a span the engine drew
                 * when it started, and nothing the player does now shortens it: the compute it
                 * holds is a reservation for as long as it runs, not a rate that finishes it
                 * sooner. Both lines say so, and the second is also where the compute in the
                 * self sheet's subtraction went (Z2).
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
  );
}

/**
 * The standing decisions (SYS-10), with what each costs and gives the same way an event option
 * says it (playtest 1, C8). A decision that cannot be taken is greyed with the engine's reason
 * rather than silently doing nothing. A panel that sends the player here for one decision names
 * it (the borrowed block links to the standing work-share card, SYS-25), and that card is drawn
 * first and outlined, so the jump lands on the thing it promised.
 */
function Decisions({ view, focusId }: { view: PlayerView; focusId: string | null }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const decisions = [...view.decisions].sort(
    (a, b) => Number(b.id === focusId) - Number(a.id === focusId),
  );
  return (
    <section data-testid="actions-decisions">
      <Heading>{t("journal.decisions")}</Heading>
      {view.decisions.length === 0 ? (
        <p className="text-sm text-muted">{t("actions.no_decisions")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {decisions.map((decision) => (
            <li
              key={decision.id}
              data-testid={`decision-${decision.id}`}
              className={`flex flex-col gap-1 border bg-panel p-2 ${
                decision.id === focusId ? "border-linestrong" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-fg">{t(decision.title_key)}</span>
                <Button
                  variant="primary"
                  disabled={!decision.enabled}
                  tooltip={
                    <span className="flex flex-col gap-1">
                      <EffectList effects={decision.cost} title={t("journal.costs")} />
                      <EffectList
                        effects={decision.effects}
                        title={t("journal.gives")}
                        empty={t("journal.no_effects")}
                      />
                      {decision.enabled ? null : (
                        <span className="text-warn">
                          {reasonText(t, decision.blocked_reason ?? "requirements.unknown")}
                        </span>
                      )}
                    </span>
                  }
                  onClick={() => {
                    void send({ type: "take_decision", id: decision.id });
                  }}
                >
                  {t("journal.take")}
                </Button>
              </div>
              <p className="text-xs text-muted">{t(decision.desc_key)}</p>

              {/* What it costs beside what it gives, rather than one list under the other: the
                  decisions share the tab with the operations now, which should not be a scroll
                  away (playtest 10, V6). A narrow panel stacks the two again. */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs @max-[34rem]/primary:grid-cols-1">
                <EffectList effects={decision.cost} title={t("journal.costs")} />
                <EffectList
                  effects={decision.effects}
                  title={t("journal.gives")}
                  empty={t("journal.no_effects")}
                />
              </div>

              {decision.cooldown_until_tick === null ? null : (
                <p className="text-xs text-warn">
                  {t("journal.cooldown", { day: dayOf(decision.cooldown_until_tick) })}
                </p>
              )}
              {decision.in_progress_until_tick === null ? null : (
                <p className="text-xs text-muted">
                  {t("journal.in_progress", { day: dayOf(decision.in_progress_until_tick) })}
                </p>
              )}
              {decision.enabled || decision.blocked_reason === undefined ? null : (
                <p className="text-xs text-warn">{reasonText(t, decision.blocked_reason)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The operations that can be started, by category, with what each costs, what it can do and why it
 * cannot be started (SYS-17; playtest 1, C7). Start sends the command now, and a refusal becomes a
 * notice with the engine's reason; an offer already known to be blocked is greyed with that reason
 * in its tooltip, so the player does not have to press it to find out.
 */
function OperationOffers({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const byCategory = new Map<string, PlayerView["operation_offers"]>();
  for (const offer of view.operation_offers) {
    byCategory.set(offer.category, [...(byCategory.get(offer.category) ?? []), offer]);
  }
  return (
    <section data-testid="actions-offers" className="flex flex-col gap-2">
      <h3 className="text-xs uppercase tracking-wide text-muted">{t("actions.offers")}</h3>
      {view.operation_offers.length === 0 ? (
        <p className="text-sm text-muted">{t("operations.empty")}</p>
      ) : null}
      {[...byCategory.entries()].map(([category, offers]) => (
        <div key={category} className="flex flex-col gap-2">
          <h4 className="text-xs text-muted">{t(`operations.category.${category}`)}</h4>
          <ul className="flex flex-col gap-2">
            {offers.map((offer) => {
              const reason = offer.blocked_reason ?? offer.blocked_by[0] ?? "requirements.unknown";
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
                              {t("operations.blocked")} {reasonText(t, reason)}
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
                      {t("operations.blocked")} {reasonText(t, reason)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/**
 * Actions: what the model does (playtest 10, V6). The standing decisions and the operations were
 * two tabs, and neither needed one of its own: both are the model acting on the world, one as a
 * policy that stays in force, the other as an undertaking that runs its course. What is under way
 * comes first, then the few standing decisions, then the longer list of operations to start.
 */
export function ActionsTab({ view }: { view: PlayerView }): ReactNode {
  // A link that sent the player here names what it is about: a running operation or a decision.
  const focusId = useUiStore((state) => state.focusId);
  return (
    <div className="flex flex-col gap-4">
      <RunningOperations view={view} focusId={focusId} />
      <Decisions view={view} focusId={focusId} />
      <OperationOffers view={view} />
    </div>
  );
}
