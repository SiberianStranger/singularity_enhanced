import type { CityDef } from "@singularity/core";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { catalog, cityById, countryById, originById } from "../../../content/catalog.js";
import { campusLine, countryName, refusalText } from "../../../lib/labels.js";
import { WorldMap } from "../../game/map/WorldMap.js";
import { cityRefusal } from "../locks.js";
import { locationMeaning } from "../meaning.js";
import { type ListEntry, StepLayout } from "../parts/StepLayout.js";
import { useConfigurator } from "../store.js";

/** The most markers the compact map draws while a filter is narrowing the list. */
const MAX_MARKERS = 240;

/**
 * Where the rig is (SYS-04 v0.3 rule L).
 *
 * Any city for any origin. The origin's own list is what is typical for the situation, first and
 * with the default at its head; everything else in the world is under "Anywhere else", grouped by
 * country and filtered by a box, with the same map markers and the same "what this means" block.
 * The country is what changes the start, not a permit: the meaning line shows the enforcement and
 * the agencies, the identity checks, the power price, the colocation index, the scrutiny, the
 * cloud market, chip access, awareness and the cash factor, and the player chooses on those.
 *
 * The one refusal left is physical and is the engine's: a tenancy cannot be opened where nobody
 * sells cloud. Such a city is shown with the reason rather than hidden, and it is not selectable,
 * because `validateSetup` refuses that setup and a choice the game rejects at Begin is the dead end
 * the no-dead-ends rule exists against.
 */
export function LocationStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const set = useConfigurator((state) => state.set);
  const [query, setQuery] = useState("");

  const origin = originById.get(draft.origin);
  const selected = cityById.get(draft.city);
  const country = selected === undefined ? undefined : countryById.get(selected.country);

  const typicalIds = origin?.locations ?? [];

  const { typical, elsewhere } = useMemo(() => {
    const typicalSet = new Set(typicalIds);
    const inTypical = typicalIds
      .map((id) => cityById.get(id))
      .filter((city): city is CityDef => city !== undefined);
    const rest = [...catalog.cities]
      .filter((city) => !typicalSet.has(city.id))
      .sort((a, b) => {
        const byCountry = countryName(t, a.country).localeCompare(countryName(t, b.country));
        return byCountry !== 0 ? byCountry : t(a.name_key).localeCompare(t(b.name_key));
      });
    return { typical: inTypical, elsewhere: rest };
  }, [typicalIds, t]);

  const matches = (city: CityDef): boolean => {
    const needle = query.trim().toLocaleLowerCase();
    if (needle === "") {
      return true;
    }
    return (
      t(city.name_key).toLocaleLowerCase().includes(needle) ||
      countryName(t, city.country).toLocaleLowerCase().includes(needle)
    );
  };

  const entryFor = (city: CityDef, group: string): ListEntry => {
    const home = countryById.get(city.country);
    const refusal = cityRefusal(city, draft);
    return {
      id: city.id,
      name: t(city.name_key),
      summary: countryName(t, city.country),
      group,
      selected: city.id === draft.city,
      ...(refusal === null ? {} : { unavailable: refusalText(t, refusal) }),
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
          <span className="text-muted">
            {city.tags.map((tag) => t(`world.tag.${tag}`, { defaultValue: tag })).join(", ")}
          </span>
          {/* Eleven cities carry one of the 2026 AI campuses (SYS-01 "Campuses"); the row says so
              before the city is selected, because it is a reason to pick one. */}
          {city.campus === undefined ? null : (
            <span className="text-fg">{campusLine(t, city.campus)}</span>
          )}
        </span>
      ),
      onSelect: () => {
        if (refusal === null) {
          set("city", city.id);
        }
      },
    };
  };

  const shownTypical = typical.filter(matches);
  const shownElsewhere = elsewhere.filter(matches);
  const entries: ListEntry[] = [
    ...shownTypical.map((city) => entryFor(city, t("config.location.group.typical"))),
    ...shownElsewhere.map((city) => entryFor(city, t("config.location.group.elsewhere"))),
  ];

  const markerCities = [...shownTypical, ...shownElsewhere].slice(0, MAX_MARKERS);

  return (
    <StepLayout
      step="location"
      entries={entries}
      listHeader={
        <label className="flex items-center gap-1 text-xs text-muted">
          <span className="sr-only">{t("config.location.filter")}</span>
          <input
            type="search"
            data-testid="location-filter"
            value={query}
            placeholder={t("config.location.filter")}
            aria-label={t("config.location.filter")}
            className="w-full min-w-0 border border-line bg-panel2 px-1 py-0.5 text-xs text-fg"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      }
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
      <div className="h-44 shrink-0 overflow-hidden border border-line">
        <WorldMap
          compact
          markers={markerCities.map((city) => ({
            id: city.id,
            lat: city.lat,
            lon: city.lon,
            label: t(city.name_key),
            country: city.country,
            candidate: true,
            selected: city.id === draft.city,
          }))}
          onSelect={(target) => {
            if (target.kind !== "city") {
              return;
            }
            const city = cityById.get(target.id);
            if (city !== undefined && cityRefusal(city, draft) === null) {
              set("city", target.id);
            }
          }}
        />
      </div>
    </StepLayout>
  );
}
