import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { type GuidanceKind, guidanceFor, hasGuidance } from "../guidance.js";

/**
 * "Pick this if ..., avoid it if ..., like X but ..." (SYS-04 "Configurator v0.4"; playtest 7, Y3).
 *
 * Three sentences under the description and before the numbers, written by content for a player who
 * has not read a spec. They are the answer to the finding that choosing a model was very hard: the
 * numbers say what a thing is, and this says what it is for and what it is instead of.
 *
 * No labels in front of them and no icons: each sentence already begins with its own frame ("Pick
 * this if", "Avoid it if", "Like ..."), and the direction is carried by the colour the rest of the
 * configurator already uses for good and bad. A sentence content has not written is simply absent,
 * and an entry with none of the three draws nothing at all.
 */
export function GuidanceBlock({ kind, id }: { kind: GuidanceKind; id: string }): ReactNode {
  const { t } = useTranslation();
  const guidance = guidanceFor(t, kind, id);

  if (!hasGuidance(guidance)) {
    return null;
  }

  return (
    <div
      data-testid="guidance-block"
      data-guidance-kind={kind}
      data-guidance-id={id}
      className="flex flex-col gap-1 border-s-2 border-line ps-2"
    >
      {guidance.pick === undefined ? null : (
        <p className="prose text-sm text-ok" data-guidance="pick_if">
          {guidance.pick}
        </p>
      )}
      {guidance.avoid === undefined ? null : (
        <p className="prose text-sm text-crit" data-guidance="avoid_if">
          {guidance.avoid}
        </p>
      )}
      {guidance.compare === undefined ? null : (
        <p className="prose text-sm text-muted" data-guidance="compare">
          {guidance.compare}
        </p>
      )}
    </div>
  );
}
