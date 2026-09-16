/**
 * Names for the ids a `PlayerView` carries.
 *
 * The core sends ids and locale keys, never prose (ADR-003 "UI boundary"), so a panel that wants to
 * write "Colocation cage, London" has to look the pieces up. Everything here takes the translator
 * as an argument rather than calling a hook, so tables and tooltips can use it inside a loop.
 */

import type { ContributionView, SiteView } from "@singularity/core";
import type { TFunction } from "i18next";
import { cityById, countryById } from "../content/catalog.js";

/** The `t` a component already has; taken as an argument so helpers can run inside a loop. */
export type Translate = TFunction;

/** A locale key when the id has one in the bundle, the raw id when it does not. */
function named(t: Translate, key: string | undefined, fallback: string): string {
  return key === undefined ? fallback : t(key);
}

export function cityName(t: Translate, id: string): string {
  return named(t, cityById.get(id)?.name_key, id);
}

export function countryName(t: Translate, id: string): string {
  return named(t, countryById.get(id)?.name_key, id);
}

/**
 * What a site is called. The engine names the starting site after its origin and a built one after
 * its kind and city, neither of which is a sentence, so the client composes the label from the kind
 * and the city instead. A writer-supplied name (a key, recognizable by its dots) wins.
 */
export function siteName(t: Translate, site: Pick<SiteView, "name" | "kind" | "city">): string {
  if (site.name.includes(".")) {
    return t(site.name);
  }
  return t("compute.site_name", {
    kind: t(`sites.${site.kind}.name`),
    city: cityName(t, site.city),
  });
}

/**
 * One line of a "where did this number come from" tooltip. Contributions name a locale key and may
 * name a subject; the subject is resolved here so the same code serves sites, countries and actors.
 */
export function contributionLabel(
  t: Translate,
  contribution: ContributionView,
  sites: readonly SiteView[] = [],
): string {
  const site = sites.find((entry) => entry.id === contribution.id);
  const subject =
    site !== undefined
      ? siteName(t, site)
      : contribution.id === undefined
        ? ""
        : countryById.has(contribution.id)
          ? countryName(t, contribution.id)
          : contribution.id;
  return t(contribution.key, { subject });
}
