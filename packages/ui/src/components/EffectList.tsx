import type { EffectSummaryView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { effectText, effectTone } from "../lib/effects.js";

const TONE_CLASS = {
  good: "text-ok",
  bad: "text-crit",
  neutral: "text-fg",
} as const;

interface EffectListProps {
  effects: readonly EffectSummaryView[];
  /** Heading above the list; omitted for a bare list. */
  title?: ReactNode;
  /** Shown instead of the list when there is nothing to say. */
  empty?: ReactNode;
}

/**
 * What an option, a decision or an outcome does, as a Paradox-style list: one line per effect,
 * green when it helps and red when it costs (SYS-11 "Toasts and event windows", playtest 1 C8/C9).
 *
 * The lines are spans rather than list items so the whole thing can live inside a tooltip, where a
 * `<ul>` inside a `<span>` would not be valid markup.
 */
export function EffectList({ effects, title, empty }: EffectListProps): ReactNode {
  const { t } = useTranslation();
  if (effects.length === 0) {
    return empty === undefined ? null : <span className="text-muted">{empty}</span>;
  }
  return (
    <span className="flex flex-col gap-0.5">
      {title === undefined ? null : <span className="font-semibold">{title}</span>}
      {effects.map((effect, index) => (
        <span
          // Effects are a positional list with no ids of their own.
          // biome-ignore lint/suspicious/noArrayIndexKey: positional list, never reordered
          key={`${effect.key}-${index}`}
          className={TONE_CLASS[effectTone(effect)]}
        >
          {effectText(t, effect)}
        </span>
      ))}
    </span>
  );
}
