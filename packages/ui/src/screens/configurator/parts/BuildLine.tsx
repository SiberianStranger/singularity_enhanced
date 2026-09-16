import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  cityById,
  generationById,
  hardwareById,
  lineageById,
  originById,
} from "../../../content/catalog.js";
import { rateDraft } from "../rating.js";
import { useConfigurator } from "../store.js";

/**
 * The build so far, as one line in the footer (playtest 4, P5).
 *
 * Nine steps is enough that "what have I actually chosen" stops being answerable without walking
 * back through them, and the summary step is one of the nine. The line sits between Reroll and
 * Next, where it is under the player's eyes on every step, and it is one line: it never wraps, it
 * never scrolls, and on a screen too narrow to hold it the end is cut with an ellipsis, the end
 * being the least important part of it.
 *
 * Everything in it is already on some step's screen; this is a reminder, not a second source of
 * truth, so it reads its terms out of the same catalog the steps do.
 */
export function BuildLine(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);

  const parts = [
    originById.get(draft.origin)?.name_key,
    generationById.get(draft.generation)?.name_key,
    lineageById.get(draft.lineage)?.name_key,
    hardwareById.get(draft.hardware)?.name_key,
    cityById.get(draft.city)?.name_key,
  ]
    .filter((key): key is string => typeof key === "string" && key !== "")
    .map((key) => t(key));

  parts.push(t("config.build.quirks", { count: draft.quirks.length }));
  parts.push(t("config.build.rating", { value: rateDraft(draft).value }));

  const line = parts.join(t("config.build.separator"));

  return (
    <span
      data-testid="build-line"
      title={line}
      // `min-w-0` is what lets the ellipsis happen at all inside a flex row, and `flex-1` is what
      // gives the line the space between the two groups of buttons.
      className="min-w-0 flex-1 truncate text-center text-xs text-muted"
    >
      {line}
    </span>
  );
}
