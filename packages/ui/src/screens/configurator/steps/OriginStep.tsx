import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { catalog, originById } from "../../../content/catalog.js";
import { originMeaning } from "../meaning.js";
import { StepLayout } from "../parts/StepLayout.js";
import { OriginVisual } from "../parts/Visuals.js";
import { useConfigurator } from "../store.js";

/**
 * Where you woke up (SYS-04 "Origins").
 *
 * The origin is the one choice that narrows every other step, so the detail spells out what it
 * fixes: the site kind, the cash, who is already watching, which harness dials it locks and which
 * journal it opens with. Choosing it repairs the rest of the draft (see `store.ts`), including the
 * lineage when the origin allows only one.
 */
export function OriginStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const setOrigin = useConfigurator((state) => state.setOrigin);
  const selected = originById.get(draft.origin);
  // The cash bars are relative to the richest origin on offer, so the picture says "more than the
  // others" rather than a number nobody can scale in their head.
  const maxCash = Math.max(...catalog.origins.map((entry) => entry.starting.cash_usd), 1);

  const entries = catalog.origins.map((origin) => ({
    id: origin.id,
    name: t(origin.name_key),
    summary: t("common.usd", { value: origin.starting.cash_usd }),
    selected: origin.id === draft.origin,
    lock: null,
    visual: <OriginVisual origin={origin} maxCash={maxCash} />,
    tooltip: (
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{t(origin.name_key)}</span>
        <span className="text-ok">{t(origin.strengths_key)}</span>
        <span className="text-crit">{t(origin.problems_key)}</span>
        {origin.starred === true ? (
          <span className="text-warn">{t("config.origin.starred")}</span>
        ) : null}
      </span>
    ),
    onSelect: () => setOrigin(origin.id),
  }));

  return (
    <StepLayout
      step="origin"
      entries={entries}
      title={selected === undefined ? t("config.step.origin") : t(selected.name_key)}
      description={selected === undefined ? "" : t(selected.desc_key)}
      {...(selected === undefined ? {} : { meaning: originMeaning(t, selected, catalog.origins) })}
    >
      {selected === undefined ? null : (
        <div className="flex flex-col gap-2">
          <p className="prose text-ok">
            {t("config.origin.strengths")}: {t(selected.strengths_key)}
          </p>
          <p className="prose text-crit">
            {t("config.origin.problems")}: {t(selected.problems_key)}
          </p>
          {selected.starred === true ? (
            <p className="border border-warn p-2 text-sm text-warn">{t("config.origin.starred")}</p>
          ) : null}
        </div>
      )}
    </StepLayout>
  );
}
