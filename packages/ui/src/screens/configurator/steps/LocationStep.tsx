import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  catalog,
  citiesOfOrigin,
  cityById,
  countryById,
  originById,
} from "../../../content/catalog.js";
import { WorldMap } from "../../game/map/WorldMap.js";
import { locationLock } from "../locks.js";
import { locationMeaning } from "../meaning.js";
import { LockNote, StepLayout } from "../parts/StepLayout.js";
import { useConfigurator } from "../store.js";

/**
 * Where the rig is (SYS-04 "Location").
 *
 * The cities on offer are the origin's own list, so Novosibirsk and San Jose appear because content
 * put them there (playtest 2, K8), not because this file names them. The small map is the same
 * component the game screen uses, in its compact mode, so the place the player picks looks the same
 * as the place they will be playing in.
 */
export function LocationStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const cities = citiesOfOrigin(originById.get(draft.origin));
  const selected = cityById.get(draft.city);
  const country = selected === undefined ? undefined : countryById.get(selected.country);
  const lock = selected === undefined ? null : locationLock(selected.id, draft);

  const entries = cities.map((city) => {
    const home = countryById.get(city.country);
    return {
      id: city.id,
      name: t(city.name_key),
      summary: home === undefined ? city.country : t(home.name_key),
      selected: city.id === draft.city,
      lock: locationLock(city.id, draft),
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t(city.name_key)}</span>
          <span>
            {t("config.location.scrutiny")}: {t("common.percent", { value: city.scrutiny })}
          </span>
          {home === undefined ? null : (
            <span>
              {t("config.location.enforcement")}:{" "}
              {t("common.percent", { value: home.ai_enforcement })}
            </span>
          )}
          <span className="text-muted">{city.tags.join(", ")}</span>
        </span>
      ),
      onSelect: () => set("city", city.id),
    };
  });

  return (
    <StepLayout
      step="location"
      entries={entries}
      title={selected === undefined ? t("config.step.location") : t(selected.name_key)}
      description={
        country === undefined
          ? ""
          : t("config.location.country_line", { country: t(country.name_key) })
      }
      {...(selected === undefined
        ? {}
        : { meaning: locationMeaning(t, selected, country, catalog.cities, catalog.countries) })}
    >
      {lock === null ? null : <LockNote lock={lock} />}
      <div className="h-44 shrink-0 overflow-hidden border border-line">
        <WorldMap
          compact
          markers={cities.map((city) => ({
            id: city.id,
            lat: city.lat,
            lon: city.lon,
            label: t(city.name_key),
            country: city.country,
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
    </StepLayout>
  );
}
