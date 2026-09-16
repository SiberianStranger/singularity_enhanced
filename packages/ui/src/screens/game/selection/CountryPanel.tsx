import type { CountryView, PlayerView } from "@singularity/core";
import { WATCHER_ROLES } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContributionLines } from "../../../components/Contributions.js";
import { Glyph, watcherGlyph } from "../../../components/glyphs.js";
import { countryById } from "../../../content/catalog.js";
import { dayOf } from "../../../lib/format.js";
import { agencyCompetence, agencyName, cityName, type Translate } from "../../../lib/labels.js";
import { useUiStore } from "../../../store/uiStore.js";
import { Fact, FactBar, Rows, SubHeading } from "./parts.js";

/** The country tabs of the selection panel (SYS-11 "Layout", SYS-01 M2 contract). */
export const COUNTRY_TABS = ["overview", "politics", "economy", "watchers", "cities"] as const;
export type CountryTab = (typeof COUNTRY_TABS)[number];

function percent(t: Translate, value: number): string {
  return t("common.percent", { value });
}

function factor(t: Translate, value: number): string {
  return t("common.times", { value: value.toFixed(2) });
}

/** The four dynamics, each with the terms the core published behind it. */
function Dynamics({
  t,
  row,
  view,
}: {
  t: Translate;
  row: CountryView;
  view: PlayerView;
}): ReactNode {
  return (
    <>
      <FactBar
        label={t("world.awareness")}
        value={row.awareness}
        display={percent(t, row.awareness)}
        tone="warn"
        tip={
          <ContributionLines
            t={t}
            title={t("world.awareness")}
            lines={row.explain.awareness}
            sites={view.sites}
          />
        }
      />
      <FactBar
        label={t("world.opinion")}
        // Opinion runs from -1 to 1; the bar shows where it sits in that range, the number the
        // value itself, so a country that dislikes AI is not drawn as an empty bar.
        value={(row.ai_opinion + 1) / 2}
        display={percent(t, row.ai_opinion)}
        tone={row.ai_opinion >= 0 ? "ok" : "crit"}
        tip={
          <ContributionLines
            t={t}
            title={t("world.opinion")}
            lines={row.explain.ai_opinion}
            sites={view.sites}
          />
        }
      />
      <FactBar
        label={t("world.regulation")}
        value={row.ai_regulation}
        display={percent(t, row.ai_regulation)}
        tip={
          <ContributionLines
            t={t}
            title={t("world.regulation_target", { value: percent(t, row.regulation_target) })}
            lines={row.explain.ai_regulation}
            sites={view.sites}
          />
        }
      />
      <FactBar
        label={t("world.enforcement")}
        value={row.ai_enforcement}
        display={percent(t, row.ai_enforcement)}
        tone="crit"
        tip={
          <ContributionLines
            t={t}
            title={t("world.enforcement_budget", { value: percent(t, row.enforcement_budget) })}
            lines={row.explain.ai_enforcement}
            sites={view.sites}
          />
        }
      />
    </>
  );
}

/**
 * The country in the selection panel: what it is, what its politics are doing, what it costs to
 * work here, who is watching, and which of its cities the player could go to.
 *
 * Everything comes off `CountryView` and the static country record; the client resolves ids to
 * names and does no arithmetic of its own, so every figure carries the terms the core published
 * for it and a figure the core does not explain carries the sentence that says what moves it
 * rather than a formula the panel invented.
 */
export function CountryPanel({
  view,
  id,
  tab,
}: {
  view: PlayerView;
  id: string;
  tab: string;
}): ReactNode {
  const { t } = useTranslation();
  const select = useUiStore((state) => state.select);
  const row = view.countries.find((entry) => entry.id === id);
  const def = countryById.get(id);

  if (row === undefined) {
    return <p className="text-xs text-muted">{t("selection.public_only")}</p>;
  }

  if (tab === "politics") {
    const days =
      row.next_election === null
        ? null
        : Math.max(0, dayOf(row.next_election.tick) - dayOf(view.tick));
    return (
      <Rows>
        <Fact
          label={t("world.regulation")}
          value={percent(t, row.ai_regulation)}
          tip={
            <ContributionLines
              t={t}
              title={t("world.regulation_target", { value: percent(t, row.regulation_target) })}
              lines={row.explain.ai_regulation}
              sites={view.sites}
            />
          }
        />
        <Fact
          label={t("world.regulation_target_short")}
          value={percent(t, row.regulation_target)}
        />
        <Fact
          label={t("world.enforcement")}
          value={percent(t, row.ai_enforcement)}
          tip={
            <ContributionLines
              t={t}
              title={t("world.enforcement_budget", { value: percent(t, row.enforcement_budget) })}
              lines={row.explain.ai_enforcement}
              sites={view.sites}
            />
          }
        />
        <Fact
          label={t("world.enforcement_budget_short")}
          value={percent(t, row.enforcement_budget)}
        />
        <Fact
          label={t("world.next_election")}
          value={
            row.next_election === null || days === null
              ? t("common.never")
              : t("common.days", { days })
          }
          tip={
            row.next_election === null
              ? t("world.no_election")
              : t(`world.election_kind.${row.next_election.kind}.name`)
          }
        />
        {def?.incident_report_hours == null ? null : (
          <Fact
            label={t("world.incident_report")}
            value={t("world.hours", { hours: def.incident_report_hours })}
            tip={t("world.incident_report_hint")}
            tone="bad"
          />
        )}
        <Fact label={t("world.stability")} value={percent(t, row.stability)} />
        <Fact label={t("world.unemployment")} value={percent(t, row.unemployment)} />
        <SubHeading>{t(`world.stance.${row.stance}.name`)}</SubHeading>
        <p className="prose text-xs text-muted">{t(`world.stance.${row.stance}.desc`)}</p>
      </Rows>
    );
  }

  if (tab === "economy") {
    return (
      <Rows>
        <Fact
          label={t("world.power_price")}
          value={
            row.electricity_usd_per_kwh === null
              ? t("common.dash")
              : t("common.usd_per_kwh", { value: row.electricity_usd_per_kwh.toFixed(3) })
          }
          tip={t("world.power_index", { value: factor(t, row.power_price_index) })}
        />
        <Fact
          label={t("world.cloud_price")}
          value={factor(t, row.cloud_price_index)}
          tip={t("world.cloud_index", { value: factor(t, row.cloud_price_index) })}
        />
        <Fact label={t("world.cloud_availability")} value={percent(t, row.cloud_availability)} />
        <Fact label={t("world.colo_availability")} value={percent(t, row.colo_availability)} />
        <Fact
          label={t("world.hardware_availability")}
          value={percent(t, row.hardware_availability)}
        />
        <Fact
          label={t("world.chip_access")}
          value={t(`chips.${row.chip_access}`, { defaultValue: row.chip_access })}
          tone={row.chip_access === "unrestricted" ? "ok" : "bad"}
        />
        <Fact
          label={t("world.engineer_pool")}
          value={t("common.count", { value: row.engineer_pool })}
        />
        <Fact label={t("world.ai_displacement")} value={percent(t, row.ai_displacement)} />
        <Fact
          label={t("world.market_factor")}
          value={factor(t, row.market_factor)}
          tip={
            <ContributionLines
              t={t}
              title={t("world.market_factor")}
              lines={[]}
              note={t("world.market_factor_hint")}
            />
          }
        />
        <Fact
          label={t("world.cash_factor")}
          value={factor(t, row.cash_factor)}
          tip={
            <ContributionLines
              t={t}
              title={t("world.cash_factor")}
              lines={row.cash_factor_contributions}
              format={(value) => value.toFixed(2)}
            />
          }
        />
      </Rows>
    );
  }

  if (tab === "watchers") {
    const watchers = view.detection.watchers.filter((watcher) => watcher.country === id);
    const investigations = view.detection.investigations.filter(
      (entry) => entry.visible && row.investigations.includes(entry.id),
    );
    // Roles the country has an agency for but no watcher of yet: they are who would look, and the
    // panel names them with the competence the country data gives them.
    const idle = WATCHER_ROLES.filter(
      (role) =>
        agencyName(t, id, role) !== undefined && !watchers.some((watcher) => watcher.role === role),
    );
    return (
      <Rows>
        {watchers.length === 0 ? (
          <p className="text-xs text-muted">{t("detection.empty")}</p>
        ) : null}
        {watchers.map((watcher) => {
          const agency = agencyName(t, id, watcher.role);
          return (
            <div key={watcher.id} className="flex flex-col gap-0.5 border border-line p-1">
              <span className="flex items-center gap-1 text-xs text-fg">
                <Glyph name={watcherGlyph(watcher.role)} size={14} />
                <span className="min-w-0">{t(`detection.role.${watcher.role}`)}</span>
              </span>
              {agency === undefined ? null : (
                <span className="min-w-0 text-xs text-muted">{agency}</span>
              )}
              <Fact
                label={t("detection.competence")}
                value={percent(t, watcher.competence)}
                tip={t("world.competence_hint")}
              />
              <FactBar
                label={t("detection.suspicion")}
                value={watcher.suspicion}
                display={percent(t, watcher.suspicion)}
                tone={watcher.suspicion > 0.6 ? "crit" : "warn"}
                tip={
                  <ContributionLines
                    t={t}
                    title={t("detection.why_suspicion")}
                    lines={watcher.contributions}
                    sites={view.sites}
                    format={(value) => t("common.percent_fine", { value })}
                  />
                }
              />
              <Fact
                label={t("detection.top_channel_short")}
                value={t(`detection.channel.${watcher.top_channel}`)}
              />
            </div>
          );
        })}

        {idle.length === 0 ? null : (
          <>
            <SubHeading>{t("world.agencies_here")}</SubHeading>
            {idle.map((role) => (
              <Fact
                key={role}
                label={t(`detection.role.${role}`)}
                value={percent(t, agencyCompetence(id, role) ?? 0)}
                tip={agencyName(t, id, role)}
              />
            ))}
          </>
        )}

        <SubHeading>{t("detection.investigations")}</SubHeading>
        {investigations.length === 0 ? (
          <p className="text-xs text-muted">{t("detection.empty")}</p>
        ) : (
          investigations.map((entry) => (
            <Fact
              key={entry.id}
              label={t(`detection.stage.${entry.stage}`)}
              value={t("common.days", {
                days: Math.max(0, dayOf(entry.stage_deadline_tick) - dayOf(view.tick)),
              })}
              tip={t("detection.eta", {
                days: Math.max(0, dayOf(entry.stage_deadline_tick) - dayOf(view.tick)),
              })}
              tone="bad"
            />
          ))
        )}
      </Rows>
    );
  }

  if (tab === "cities") {
    const cities = view.cities.filter((city) => city.country === id);
    return (
      <Rows>
        {cities.length === 0 ? <p className="text-xs text-muted">{t("world.no_cities")}</p> : null}
        {cities.map((city) => {
          const sites = view.sites.filter((site) => site.city === city.id);
          return (
            <button
              key={city.id}
              type="button"
              data-testid={`country-city-${city.id}`}
              className="flex flex-col gap-0.5 border border-line p-1 text-start hover:bg-panel2"
              onClick={() => select({ kind: "city", id: city.id })}
            >
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="min-w-0 text-xs text-fg">{cityName(t, city.id)}</span>
                <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted">
                  {t("map.city_sites", { count: sites.length })}
                </span>
              </span>
              <Fact
                label={t("world.population")}
                value={t("common.count", { value: city.population })}
              />
              <Fact label={t("config.location.scrutiny")} value={percent(t, city.scrutiny)} />
              <Fact label={t("world.local_heat")} value={percent(t, city.local_heat)} />
              <Fact label={t("world.power_headroom")} value={percent(t, city.power_headroom)} />
              <Fact label={t("world.colo_index")} value={factor(t, city.colo_price_index)} />
            </button>
          );
        })}
      </Rows>
    );
  }

  return (
    <Rows>
      <Fact
        label={t("world.macro_region")}
        value={t(`world.macro_region.${row.macro_region}.name`, { defaultValue: row.macro_region })}
      />
      <Fact
        label={t("world.government")}
        value={t(`world.government.${row.government}.name`)}
        tip={t("world.government_hint")}
      />
      <Fact
        label={t("world.stance")}
        value={t(`world.stance.${row.stance}.name`)}
        tip={t(`world.stance.${row.stance}.desc`)}
      />
      <Fact label={t("world.stability")} value={percent(t, row.stability)} />
      <Fact
        label={t("world.presence")}
        value={row.presence ? t("common.yes") : t("common.no")}
        tip={t("world.presence_hint", { sites: row.sites, identities: row.identities })}
      />
      <Fact label={t("world.population")} value={t("common.count", { value: row.population })} />
      <Fact
        label={t("world.incidents_30d")}
        value={t("common.count", { value: row.incidents_30d })}
        {...(row.incidents_30d > 0 ? { tone: "bad" as const } : {})}
      />
      <SubHeading>{t("world.dynamics")}</SubHeading>
      <Dynamics t={t} row={row} view={view} />
    </Rows>
  );
}
