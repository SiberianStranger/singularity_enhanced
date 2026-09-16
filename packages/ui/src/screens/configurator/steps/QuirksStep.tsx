import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card.js";
import { catalog } from "../../../content/catalog.js";
import { QUIRK_BUDGET, quirkCost, useConfigurator } from "../store.js";

export function QuirksStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const toggleQuirk = useConfigurator((state) => state.toggleQuirk);
  const used = quirkCost(draft.quirks);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.quirks.intro")}</p>
      <p className="font-mono text-sm text-fg">
        {t("config.quirks.budget", { used, total: QUIRK_BUDGET })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.quirks.map((quirk) => {
          const selected = draft.quirks.includes(quirk.id);
          const wouldExceed = !selected && used + quirk.cost > QUIRK_BUDGET;
          return (
            <Card
              key={quirk.id}
              title={t(quirk.name_key)}
              subtitle={t("config.quirks.cost", { value: quirk.cost })}
              selected={selected}
              disabled={wouldExceed}
              onSelect={() => toggleQuirk(quirk.id)}
            >
              {t(quirk.desc_key)}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
