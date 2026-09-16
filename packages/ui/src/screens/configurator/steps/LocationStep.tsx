import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card.js";
import { citiesOfOrigin, countryById, originById } from "../../../content/catalog.js";
import { WorldMap } from "../../game/map/WorldMap.js";
import { useConfigurator } from "../store.js";

export function LocationStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const cities = citiesOfOrigin(originById.get(draft.origin));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.location.intro")}</p>

      <div className="h-56 overflow-hidden rounded border border-line">
        <WorldMap
          compact
          markers={cities.map((city) => ({
            id: city.id,
            lat: city.lat,
            lon: city.lon,
            label: t(city.name_key),
            candidate: true,
            selected: city.id === draft.city,
          }))}
          onSelect={(target) => {
            if (target.kind === "city") {
              set("city", target.id);
            }
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cities.map((city) => {
          const country = countryById.get(city.country);
          return (
            <Card
              key={city.id}
              title={t(city.name_key)}
              subtitle={country === undefined ? undefined : t(country.name_key)}
              selected={city.id === draft.city}
              onSelect={() => set("city", city.id)}
            >
              <span className="flex flex-col gap-0.5 font-mono">
                {country?.electricity_usd_per_kwh == null ? null : (
                  <span>
                    {t("config.location.power_price", {
                      value: country.electricity_usd_per_kwh,
                    })}
                  </span>
                )}
                <span>
                  {t("config.location.regulation")}:{" "}
                  {t("common.percent", { value: country?.ai_regulation ?? 0 })}
                </span>
                <span>
                  {t("config.location.enforcement")}:{" "}
                  {t("common.percent", { value: country?.ai_enforcement ?? 0 })}
                </span>
                <span>
                  {t("config.location.scrutiny")}: {t("common.percent", { value: city.scrutiny })}
                </span>
                <span>
                  {t("config.location.chips", {
                    value: t(`chips.${country?.chip_access ?? "unrestricted"}`),
                  })}
                </span>
                <span className="text-muted">
                  {t("config.location.tags", { value: city.tags.join(", ") })}
                </span>
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
