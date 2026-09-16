import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card.js";
import { catalog } from "../../../content/catalog.js";
import { useConfigurator } from "../store.js";

export function OriginStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const setOrigin = useConfigurator((state) => state.setOrigin);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.origin.intro")}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.origins.map((origin) => (
          <Card
            key={origin.id}
            title={t(origin.name_key)}
            subtitle={`${t("config.origin.starting_cash")}: ${t("common.usd", { value: origin.starting.cash_usd })}`}
            selected={origin.id === draft.origin}
            warning={origin.starred === true ? t("config.origin.starred") : undefined}
            onSelect={() => setOrigin(origin.id)}
          >
            <span className="flex flex-col gap-1">
              <span>{t(origin.desc_key)}</span>
              <span className="text-ok">
                {t("config.origin.strengths")}: {t(origin.strengths_key)}
              </span>
              <span className="text-warn">
                {t("config.origin.problems")}: {t(origin.problems_key)}
              </span>
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
