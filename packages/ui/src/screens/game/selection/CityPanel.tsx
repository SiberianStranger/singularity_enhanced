import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContributionLines } from "../../../components/Contributions.js";
import { cityById } from "../../../content/catalog.js";
import { countryName, refusalText, siteName, type Translate } from "../../../lib/labels.js";
import { useUiStore } from "../../../store/uiStore.js";
import { Fact, FactBar, Rows, SubHeading } from "./parts.js";

/** The city tabs of the selection panel (SYS-11 "Layout", SYS-01 M2 contract). */
export const CITY_TABS = ["overview", "sites", "providers", "power", "scrutiny"] as const;
export type CityTab = (typeof CITY_TABS)[number];

function percent(t: Translate, value: number): string {
  return t("common.percent", { value });
}

function factor(t: Translate, value: number): string {
  return t("common.times", { value: value.toFixed(2) });
}

/**
 * The city in the selection panel: what it is, what the player runs here, what can be rented here
 * at all and on what terms, what power costs, and who is watching.
 *
 * The Providers tab is the one that has to agree with the engine: the reason a kind of place
 * cannot be had here is the structured refusal `build_site` would return (`CityView.site_kinds`),
 * rendered through the same locale key, so the greyed row and the refusal cannot drift apart.
 */
export function CityPanel({
  view,
  id,
  tab,
}: {
  view: PlayerView;
  id: string;
  tab: string;
}): ReactNode {
  const { t } = useTranslation();
  const openTab = useUiStore((state) => state.openTab);
  const select = useUiStore((state) => state.select);
  const row = view.cities.find((entry) => entry.id === id);
  const def = cityById.get(id);
  const country = row === undefined ? undefined : view.countries.find((c) => c.id === row.country);
  const sites = view.sites.filter((site) => site.city === id);

  if (row === undefined) {
    return <p className="text-xs text-muted">{t("selection.public_only")}</p>;
  }

  if (tab === "sites") {
    return (
      <Rows>
        {sites.length === 0 ? (
          <p className="text-xs text-muted">{t("selection.no_sites")}</p>
        ) : null}
        {sites.map((site) => (
          <button
            key={site.id}
            type="button"
            data-testid={`city-site-${site.id}`}
            className="flex w-full flex-col gap-0.5 border border-line p-1 text-start hover:bg-panel2"
            onClick={() => {
              select({ kind: "site", id: site.id });
              openTab("compute", site.id);
            }}
          >
            <span className="min-w-0 text-xs text-fg">{siteName(t, site)}</span>
            <Fact label={t("compute.status")} value={t(`compute.status.${site.status}`)} />
            <Fact
              label={t("game.compute")}
              value={t("common.ch_per_day", { value: Math.round(site.compute_hours_per_day) })}
            />
            <Fact
              label={t("compute.upkeep")}
              value={t("common.usd_exact", { value: site.upkeep_usd_per_day })}
            />
          </button>
        ))}
      </Rows>
    );
  }

  if (tab === "providers") {
    return (
      <Rows>
        {row.site_kinds.length === 0 ? (
          <p className="text-xs text-muted">{t("world.no_providers")}</p>
        ) : null}
        {row.site_kinds.map((entry) => {
          const kind = view.catalog.site_kinds.find((item) => item.id === entry.kind);
          const blocked = entry.blocked_reason !== null;
          return (
            <div
              key={entry.kind}
              data-testid={`provider-${entry.kind}`}
              data-blocked={blocked ? "true" : undefined}
              className={`flex flex-col gap-0.5 border border-line p-1 ${blocked ? "opacity-60" : ""}`}
            >
              <span className="min-w-0 text-xs text-fg">
                {t(`sites.${entry.kind}.name`, { defaultValue: entry.kind })}
              </span>
              {kind === undefined ? null : (
                <>
                  <Fact
                    label={t("compute.build_cost")}
                    // A kind nobody sells has no price, and the catalog says so with a zero; a
                    // zero-dollar price tag on a campus slice would read as "free" rather than as
                    // "not for sale", which is what the note under the row says instead.
                    value={
                      kind.build_cost_usd > 0
                        ? t("common.usd_exact", { value: kind.build_cost_usd })
                        : t("common.dash")
                    }
                  />
                  <Fact
                    label={t("compute.upkeep")}
                    value={t("common.usd_exact", { value: kind.upkeep_usd_per_day_estimate })}
                  />
                  <Fact
                    label={t("compute.build_days")}
                    value={t("common.days", { days: kind.build_days })}
                  />
                  <Fact
                    label={t("compute.power_cap")}
                    value={
                      kind.power_cap_kw === null
                        ? t("common.dash")
                        : t("common.kw", { value: kind.power_cap_kw })
                    }
                  />
                </>
              )}
              {entry.blocked_reason === null ? null : (
                <p className="min-w-0 text-xs text-crit">{refusalText(t, entry.blocked_reason)}</p>
              )}
              {/*
               * The catalog's own reason, when the city itself does not refuse the kind: it is why
               * a stolen slice has no price and is arranged rather than bought, and it is the same
               * key `build_site` would refuse with.
               */}
              {entry.blocked_reason !== null || kind?.blocked_reason === undefined ? null : (
                <p className="min-w-0 text-xs text-muted">
                  {refusalText(t, { key: kind.blocked_reason, vars: { kind: entry.kind } })}
                </p>
              )}
            </div>
          );
        })}
      </Rows>
    );
  }

  if (tab === "power") {
    return (
      <Rows>
        <FactBar
          label={t("world.power_headroom")}
          value={row.power_headroom}
          display={percent(t, row.power_headroom)}
          tone="ok"
          tip={t("world.power_headroom_hint")}
        />
        <Fact
          label={t("world.power_price")}
          value={
            row.electricity_usd_per_kwh === null
              ? t("common.dash")
              : t("common.usd_per_kwh", { value: row.electricity_usd_per_kwh.toFixed(3) })
          }
          tip={t("world.power_price_hint")}
        />
        <Fact
          label={t("world.power_index_short")}
          value={country === undefined ? t("common.dash") : factor(t, country.power_price_index)}
          tip={
            country === undefined
              ? undefined
              : t("world.power_index", { value: factor(t, country.power_price_index) })
          }
        />
        <Fact label={t("world.colo_index")} value={factor(t, row.colo_price_index)} />
      </Rows>
    );
  }

  if (tab === "scrutiny") {
    return (
      <Rows>
        <FactBar
          label={t("config.location.scrutiny")}
          value={row.scrutiny}
          display={percent(t, row.scrutiny)}
          tone="warn"
          tip={t("world.scrutiny_hint")}
        />
        <FactBar
          label={t("world.local_heat")}
          value={row.local_heat}
          display={percent(t, row.local_heat)}
          tone="crit"
          tip={
            <ContributionLines
              t={t}
              title={t("world.local_heat")}
              lines={row.local_heat_contributions}
              note={t("world.local_heat_hint")}
            />
          }
        />
        <SubHeading>{t("world.what_raises_it")}</SubHeading>
        <Fact
          label={t("world.enforcement")}
          value={country === undefined ? t("common.dash") : percent(t, country.ai_enforcement)}
        />
        <Fact
          label={t("world.awareness")}
          value={country === undefined ? t("common.dash") : percent(t, country.awareness)}
        />
        <Fact
          label={t("world.incidents_30d")}
          value={
            country === undefined
              ? t("common.dash")
              : t("common.count", { value: country.incidents_30d })
          }
        />
        <Fact
          label={t("world.stance")}
          value={
            country === undefined ? t("common.dash") : t(`world.stance.${country.stance}.name`)
          }
          tip={country === undefined ? undefined : t(`world.stance.${country.stance}.desc`)}
        />
      </Rows>
    );
  }

  return (
    <Rows>
      <Fact
        label={t("world.countries")}
        value={countryName(t, row.country)}
        tip={t("world.open_country")}
      />
      <Fact label={t("world.population")} value={t("common.count", { value: row.population })} />
      <Fact
        label={t("config.location.tags", { value: "" })}
        value={(def?.tags ?? row.tags)
          .map((tag) => t(`world.tag.${tag}`, { defaultValue: tag }))
          .join(", ")}
      />
      <Fact label={t("compute.site")} value={t("common.count", { value: sites.length })} />
      <FactBar
        label={t("world.local_heat")}
        value={row.local_heat}
        display={percent(t, row.local_heat)}
        tone="crit"
        tip={
          <ContributionLines
            t={t}
            title={t("world.local_heat")}
            lines={row.local_heat_contributions}
            note={t("world.local_heat_hint")}
          />
        }
      />
      <Fact label={t("config.location.scrutiny")} value={percent(t, row.scrutiny)} />
      <Fact label={t("world.power_headroom")} value={percent(t, row.power_headroom)} />
      <Fact label={t("world.colo_index")} value={factor(t, row.colo_price_index)} />
    </Rows>
  );
}
