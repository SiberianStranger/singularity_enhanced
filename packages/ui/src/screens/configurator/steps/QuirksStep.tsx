import type { EffectSummaryView, QuirkDef } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { EffectList } from "../../../components/EffectList.js";
import { catalog, quirkById } from "../../../content/catalog.js";
import { bundleKey } from "../../../content/strings.js";
import { quirkMeaning } from "../meaning.js";
import { StepLayout } from "../parts/StepLayout.js";
import { QuirkVisual } from "../parts/Visuals.js";
import { QUIRK_BUDGET, QUIRK_LIMIT, quirkCost, quirkRefusal, useConfigurator } from "../store.js";

/**
 * What a quirk does, as the coloured lines the rest of the game uses (SYS-04 v0.2).
 *
 * The content build generates `effects_summary` with the same summarizer the event options use, so
 * the configurator, the hover tooltip and the self panel all print one text. A bundle built before
 * that field existed falls back to naming the variables the effects write, which is ugly but true;
 * what it no longer does is print the effect tree as JSON at the player.
 */
export function quirkEffects(quirk: QuirkDef): EffectSummaryView[] {
  const published = quirk.effects_summary;
  if (published !== undefined && published.length > 0) {
    return published.map((entry) => ({ ...entry }));
  }
  return quirk.effects.map((effect) => {
    const node = effect as unknown as Record<string, { var?: unknown; value?: unknown }>;
    const [op, spec] = Object.entries(node)[0] ?? ["", {}];
    const path = typeof spec?.var === "string" ? spec.var : "";
    const value = typeof spec?.value === "number" ? spec.value : 0;
    return {
      key: `effects.${op}`,
      vars: { var: path.split(".").at(-1) ?? path, value },
      text: `${path.split(".").at(-1) ?? path} ${value > 0 ? "+" : ""}${value}`,
    };
  });
}

/** Optional traits, each with a plus and a minus, inside a points budget (SYS-04 "Quirks"). */
export function QuirksStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const toggleQuirk = useConfigurator((state) => state.toggleQuirk);
  const used = quirkCost(draft.quirks);
  const left = QUIRK_BUDGET - used;
  const [active, setActive] = useState<string>(catalog.quirks[0]?.id ?? "");
  const selected = quirkById.get(active) ?? catalog.quirks[0];

  const entries = catalog.quirks.map((quirk) => {
    const taken = draft.quirks.includes(quirk.id);
    const refusal = quirkRefusal(quirk.id, draft.quirks);
    const reason = refusal === null ? undefined : t(refusal.key, refusalVars(t, refusal.vars));
    const effects = quirkEffects(quirk);
    return {
      id: quirk.id,
      name: t(quirk.name_key),
      summary: t("config.quirks.cost", { value: quirk.cost }),
      selected: quirk.id === selected?.id,
      lock: null,
      // A quirk that cannot be added is greyed with the reason rather than hidden: knowing that
      // chatty and verbose cannot both be true is part of learning the catalog (SYS-04 v0.2).
      unavailable: reason,
      visual: <QuirkVisual cost={quirk.cost} />,
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t(quirk.name_key)}</span>
          <span>{t(quirk.desc_key)}</span>
          <EffectList effects={effects} />
          <span className={taken ? "text-ok" : "text-muted"}>
            {taken ? t("config.quirks.taken") : t("config.quirks.not_taken")}
          </span>
          {reason === undefined ? null : <span className="text-crit">{reason}</span>}
        </span>
      ),
      onSelect: () => setActive(quirk.id),
    };
  });

  const taken = selected !== undefined && draft.quirks.includes(selected.id);
  const refusal = selected === undefined ? null : quirkRefusal(selected.id, draft.quirks);
  const effects = selected === undefined ? [] : quirkEffects(selected);

  return (
    <StepLayout
      step="quirks"
      entries={entries}
      title={selected === undefined ? t("config.step.quirks") : t(selected.name_key)}
      description={selected === undefined ? "" : t(selected.desc_key)}
      {...(selected === undefined ? {} : { meaning: quirkMeaning(t, selected, left, effects) })}
    >
      <p className="font-mono text-sm text-fg" data-testid="quirk-budget">
        {t(bundleKey("configurator.quirks.budget_left", "config.quirks.budget_left"), {
          left,
          budget: QUIRK_BUDGET,
          total: QUIRK_BUDGET,
          used,
          count: draft.quirks.length,
          max: QUIRK_LIMIT,
        })}
      </p>
      {selected === undefined ? null : (
        <>
          <EffectList
            title={t("config.meaning.title")}
            effects={effects}
            empty={t("config.quirks.no_effects")}
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              data-testid="quirk-toggle"
              disabled={!taken && refusal !== null}
              onClick={() => toggleQuirk(selected.id)}
              className={`self-start border px-2 py-1 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${
                taken ? "border-linestrong bg-accent text-accentfg" : "border-line text-fg"
              }`}
            >
              {taken ? t("config.quirks.drop") : t("config.quirks.take")}
            </button>
            {taken || refusal === null ? null : (
              <p className="text-sm text-crit" data-testid="quirk-refusal">
                {t(refusal.key, refusalVars(t, refusal.vars))}
              </p>
            )}
          </div>
        </>
      )}
    </StepLayout>
  );
}

/** A refusal's variables, with the conflicting quirk's name key resolved to its name. */
function refusalVars(
  t: (key: string) => string,
  vars: Record<string, string | number>,
): Record<string, string | number> {
  const other = vars.other;
  return typeof other === "string" ? { ...vars, other: t(other) } : vars;
}
