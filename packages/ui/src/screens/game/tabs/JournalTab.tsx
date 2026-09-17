import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { EffectList } from "../../../components/EffectList.js";
import { Bar } from "../../../components/Meter.js";
import { RevealText } from "../../../components/RevealText.js";
import { accelerator } from "../../../lib/accelerators.js";
import { dayOf } from "../../../lib/format.js";
import { useGameStore } from "../../../store/gameStore.js";
import { openingSetupOf, openingTexts } from "../opening.js";

/**
 * Journal entries with progress and the decisions available right now (SYS-10).
 *
 * Playtest 1 (C8) found decisions that did not say what they give. Each one now lists its cost and
 * its effects the same way an event option does, and a decision that cannot be taken is greyed with
 * the engine's reason rather than silently doing nothing.
 */
export function JournalTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const setOpeningPending = useGameStore((state) => state.setOpeningPending);
  const setup = useGameStore((state) => state.setup);
  const hasOpening = openingTexts(t, openingSetupOf(t, view, setup)).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/*
       * The opening is the journal's first entry in spirit, so this is where it can be read again
       * (playtest 3, R12). The button is hidden when content has no opening for this origin, so it
       * never offers to replay nothing.
       */}
      {hasOpening ? (
        <div>
          <Button
            hotkey={accelerator(t, "story.opening.replay")}
            onClick={() => setOpeningPending(true)}
          >
            {t("story.opening.replay")}
          </Button>
        </div>
      ) : null}

      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">{t("journal.entries")}</h3>
        {view.journal.length === 0 ? (
          <p className="text-sm text-muted">{t("journal.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.journal.map((entry) => (
              <li key={entry.key} className="border border-line bg-panel p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-fg">{t(`journal.${entry.id}.title`)}</span>
                  <span className="font-mono text-xs text-muted">
                    {t("journal.stage", { index: entry.stage_index + 1 })}
                  </span>
                </div>
                <RevealText className="text-muted" text={t(`journal.${entry.id}.desc`)} />
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
              <li
                key={decision.id}
                data-testid={`decision-${decision.id}`}
                className="flex flex-col gap-1 border border-line bg-panel p-2"
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
                            {t(decision.blocked_reason ?? "requirements.unknown")}
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

                <EffectList effects={decision.cost} title={t("journal.costs")} />
                <EffectList
                  effects={decision.effects}
                  title={t("journal.gives")}
                  empty={t("journal.no_effects")}
                />

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
                  <p className="text-xs text-warn">{t(decision.blocked_reason)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
