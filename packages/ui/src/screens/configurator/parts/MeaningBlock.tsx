import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../components/Tooltip.js";
import type { Meaning, MeaningTone } from "../meaning.js";

const TONE_CLASS: Readonly<Record<MeaningTone, string>> = {
  good: "text-ok",
  bad: "text-crit",
  neutral: "text-fg",
};

/**
 * "What this means in the game", then "Pros and cons" (SYS-04 v0.2; playtest 2 K2 and K6).
 *
 * Every term is a label and a value on one line, the value colored by direction, with the rule
 * behind it in a tooltip. The two lists below are the same terms read back as sentences: a player
 * who wants the summary gets it, and a player who wants the numbers has them above it, and neither
 * can disagree with the other because both come from one list.
 */
export function MeaningBlock({ meaning }: { meaning: Meaning }): ReactNode {
  const { t } = useTranslation();

  if (meaning.lines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="meaning-block">
      <section>
        <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("config.meaning.title")}
        </h4>
        {/*
         * P2: the value sits right after its label, and the terms are packed into two columns.
         * The old two-column grid stretched every label to the full width and pushed its value to
         * the far edge, which put an inch of nothing between "Coding" and "7.2".
         */}
        <dl className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
          {meaning.lines.map((line) => (
            <div
              key={line.id}
              className="flex min-w-0 items-baseline gap-2"
              data-line={line.id}
              data-tone={line.tone}
            >
              <dt className="min-w-0 truncate text-sm text-muted">
                {line.hint === undefined || line.hint === "" ? (
                  line.label
                ) : (
                  <Tooltip content={line.hint}>
                    <span className="border-b border-dotted border-line">{line.label}</span>
                  </Tooltip>
                )}
              </dt>
              <dd className={`truncate text-sm ${TONE_CLASS[line.tone]}`}>{line.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {meaning.pros.length === 0 && meaning.cons.length === 0 ? null : (
        <section data-testid="pros-and-cons">
          <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
            {t("config.pros_and_cons")}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <ul className="flex flex-col gap-0.5">
              {meaning.pros.map((line) => (
                <li key={line} className="text-sm text-ok">
                  + {line}
                </li>
              ))}
              {meaning.pros.length === 0 ? (
                <li className="text-sm text-muted">{t("config.no_pros")}</li>
              ) : null}
            </ul>
            <ul className="flex flex-col gap-0.5">
              {meaning.cons.map((line) => (
                <li key={line} className="text-sm text-crit">
                  - {line}
                </li>
              ))}
              {meaning.cons.length === 0 ? (
                <li className="text-sm text-muted">{t("config.no_cons")}</li>
              ) : null}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
