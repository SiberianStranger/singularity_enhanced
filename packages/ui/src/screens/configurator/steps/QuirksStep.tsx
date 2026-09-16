import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { EffectList } from "../../../components/EffectList.js";
import { catalog, quirkById } from "../../../content/catalog.js";
import { quirkMeaning } from "../meaning.js";
import { StepLayout } from "../parts/StepLayout.js";
import { QuirkVisual } from "../parts/Visuals.js";
import { QUIRK_BUDGET, quirkCost, useConfigurator } from "../store.js";

/** Optional traits, each with a plus and a minus, inside a points budget (SYS-04 "Quirks"). */
export function QuirksStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const toggleQuirk = useConfigurator((state) => state.toggleQuirk);
  const used = quirkCost(draft.quirks);
  const [active, setActive] = useState<string>(catalog.quirks[0]?.id ?? "");
  const selected = quirkById.get(active) ?? catalog.quirks[0];

  const entries = catalog.quirks.map((quirk) => {
    const taken = draft.quirks.includes(quirk.id);
    return {
      id: quirk.id,
      name: t(quirk.name_key),
      summary: t("config.quirks.cost", { value: quirk.cost }),
      selected: quirk.id === selected?.id,
      lock: null,
      visual: <QuirkVisual cost={quirk.cost} />,
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t(quirk.name_key)}</span>
          <span>{t(quirk.desc_key)}</span>
          <span className={taken ? "text-ok" : "text-muted"}>
            {taken ? t("config.quirks.taken") : t("config.quirks.not_taken")}
          </span>
        </span>
      ),
      onSelect: () => setActive(quirk.id),
    };
  });

  const taken = selected !== undefined && draft.quirks.includes(selected.id);
  const wouldExceed = selected !== undefined && !taken && used + selected.cost > QUIRK_BUDGET;

  return (
    <StepLayout
      step="quirks"
      entries={entries}
      title={selected === undefined ? t("config.step.quirks") : t(selected.name_key)}
      description={selected === undefined ? "" : t(selected.desc_key)}
      {...(selected === undefined
        ? {}
        : { meaning: quirkMeaning(t, selected, QUIRK_BUDGET - used) })}
    >
      <p className="font-mono text-sm text-fg">
        {t("config.quirks.budget", { used, total: QUIRK_BUDGET })}
      </p>
      {selected === undefined ? null : (
        <>
          <EffectList
            title={t("config.meaning.title")}
            effects={selected.effects.map((effect) => ({
              key: `effects.${effect.op}`,
              text: JSON.stringify(effect),
            }))}
            empty={t("config.quirks.no_effects")}
          />
          <div>
            <button
              type="button"
              disabled={wouldExceed}
              onClick={() => toggleQuirk(selected.id)}
              className={`border px-2 py-1 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${
                taken ? "border-linestrong bg-accent text-accentfg" : "border-line text-fg"
              }`}
            >
              {taken ? t("config.quirks.drop") : t("config.quirks.take")}
            </button>
          </div>
        </>
      )}
    </StepLayout>
  );
}
