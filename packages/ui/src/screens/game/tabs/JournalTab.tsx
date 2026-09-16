import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Bar } from "../../../components/Meter.js";
import { dayOf } from "../../../lib/format.js";
import { useGameStore } from "../../../store/gameStore.js";

/** Journal entries with progress and the decisions available right now (SYS-10). */
export function JournalTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">{t("journal.entries")}</h3>
        {view.journal.length === 0 ? (
          <p className="text-sm text-muted">{t("journal.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.journal.map((entry) => (
              <li key={entry.key} className="rounded border border-line bg-panel p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-fg">{t(`journal.${entry.id}.title`)}</span>
                  <span className="font-mono text-xs text-muted">
                    {t("journal.stage", { index: entry.stage_index + 1 })}
                  </span>
                </div>
                <p className="text-xs text-muted">{t(`journal.${entry.id}.desc`)}</p>
                <Bar value={entry.progress} className="mt-1" label={t("journal.entries")} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("journal.decisions")}
        </h3>
        {view.decisions.length === 0 ? (
          <p className="text-sm text-muted">{t("journal.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.decisions.map((decision) => (
              <li key={decision.id} className="rounded border border-line bg-panel p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-fg">{t(`decisions.${decision.id}.title`)}</span>
                  <Button
                    variant="primary"
                    disabled={!decision.enabled}
                    tooltip={t("journal.cost", {
                      cash: decision.cost_cash_usd,
                      attention: decision.cost_attention,
                    })}
                    onClick={() => {
                      void send({ type: "take_decision", id: decision.id });
                    }}
                  >
                    {t("journal.take")}
                  </Button>
                </div>
                <p className="text-xs text-muted">{t(`decisions.${decision.id}.desc`)}</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
