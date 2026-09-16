import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Bar } from "../../../components/Meter.js";
import { fraction } from "../../../lib/format.js";
import { useGameStore } from "../../../store/gameStore.js";

/** Offers by category with their requirements, and what is running right now (SYS-17). */
export function OperationsTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
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
              const progress = fraction(
                view.tick - operation.started_tick,
                operation.ends_tick - operation.started_tick,
              );
              return (
                <li key={operation.instance_id} className="rounded border border-line bg-panel p-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-fg">
                      {t(`operations.${operation.operation_id}.name`)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">
                        {t("operations.progress", { percent: progress })}
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs uppercase tracking-wide text-muted">{t("operations.offers")}</h3>
        {view.operation_offers.length === 0 ? (
          <p className="text-sm text-muted">{t("operations.empty")}</p>
        ) : null}
        {[...byCategory.entries()].map(([category, offers]) => (
          <div key={category} className="flex flex-col gap-2">
            <h4 className="text-xs text-muted">{t(`operations.category.${category}`)}</h4>
            <ul className="flex flex-col gap-2">
              {offers.map((offer) => (
                <li key={offer.id} className="rounded border border-line bg-panel p-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-fg">{t(`operations.${offer.id}.name`)}</span>
                    <Button
                      variant="primary"
                      disabled={!offer.enabled}
                      tooltip={
                        offer.enabled
                          ? t(`operations.${offer.id}.desc`)
                          : `${t("operations.blocked")} ${offer.blocked_by.map((key) => t(key)).join(", ")}`
                      }
                      onClick={() => {
                        void send({ type: "start_operation", operationId: offer.id });
                      }}
                    >
                      {t("operations.start")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted">
                    {t("operations.duration", {
                      min: offer.duration_min_days,
                      max: offer.duration_max_days,
                    })}
                    {" - "}
                    {t("operations.attention", { value: offer.cost_attention })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
