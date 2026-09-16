import {
  EXPOSED_AWARENESS,
  EXPOSED_DAYS,
  EXPOSED_HUNT_LEVEL,
  EXPOSURE_CHANNELS,
  type PlayerView,
  type WatcherView,
} from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContributionLines } from "../../../components/Contributions.js";
import { Glyph, watcherGlyph } from "../../../components/glyphs.js";
import { Bar } from "../../../components/Meter.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { countryById } from "../../../content/catalog.js";
import { dayOf } from "../../../lib/format.js";
import {
  agencyName,
  contributionLabel,
  countryName,
  siteName,
  type Translate,
} from "../../../lib/labels.js";
import { useUiStore } from "../../../store/uiStore.js";

/**
 * How hard the world is looking, and how close that is to the ending it leads to (SYS-05 "Global
 * pressure", SYS-01 M2 contract).
 *
 * The two awareness figures are different questions: the global one is what the world believes,
 * the one over the countries the player is present in is what the `exposed` ending reads, and
 * printing only the first was printing the number that cannot end the run. The thresholds are the
 * engine's own constants, so the player can read the clock rather than guess at it.
 */
function HuntBlock({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const select = useUiStore((state) => state.select);
  const detection = view.detection;
  const presence = view.countries.filter((country) => country.presence);

  return (
    <section data-testid="hunt-block">
      <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">{t("world.hunt_level")}</h3>
      <div className="grid gap-2 @min-[28rem]/panel:grid-cols-2">
        <Tooltip
          className="w-full"
          content={
            <ContributionLines
              t={t}
              title={t("detection.why_hunt")}
              lines={detection.hunt_contributions}
              sites={view.sites}
              format={(value) => t("common.count", { value })}
            />
          }
        >
          <span className="flex w-full flex-col gap-0.5 border border-line p-1">
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted">{t("world.hunt_level")}</span>
              <span className="font-mono text-fg">
                {t("game.hunt_value", { value: detection.hunt_level })}
              </span>
            </span>
            <Bar value={detection.hunt_level / 5} tone="crit" label={t("world.hunt_level")} />
          </span>
        </Tooltip>

        <Tooltip
          className="w-full"
          content={
            <ContributionLines
              t={t}
              title={t("world.hunt_pressure")}
              lines={[]}
              note={t("world.hunt_pressure_hint")}
            />
          }
        >
          <span className="flex w-full flex-col gap-0.5 border border-line p-1">
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted">{t("world.hunt_pressure")}</span>
              <span className="font-mono text-fg" data-testid="hunt-pressure">
                {t("common.percent", { value: detection.hunt_pressure })}
              </span>
            </span>
            <Bar value={detection.hunt_pressure} tone="crit" label={t("world.hunt_pressure")} />
          </span>
        </Tooltip>

        <Tooltip
          className="w-full"
          content={
            <ContributionLines
              t={t}
              title={t("detection.why_awareness")}
              lines={detection.awareness_contributions}
              sites={view.sites}
            />
          }
        >
          <span className="flex w-full flex-col gap-0.5 border border-line p-1">
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted">{t("world.awareness_global")}</span>
              <span className="font-mono text-fg">
                {t("common.percent", { value: detection.awareness_global })}
              </span>
            </span>
            <Bar value={detection.awareness_global} tone="warn" label={t("world.awareness")} />
          </span>
        </Tooltip>

        <Tooltip
          className="w-full"
          content={
            <ContributionLines
              t={t}
              title={t("world.awareness_presence")}
              lines={[]}
              note={
                <>
                  {t("world.awareness_presence_hint")}
                  <br />
                  {t("world.exposed_threshold", {
                    awareness: t("common.percent", { value: EXPOSED_AWARENESS }),
                    hunt: EXPOSED_HUNT_LEVEL,
                    days: EXPOSED_DAYS,
                  })}
                </>
              }
            />
          }
        >
          <span className="flex w-full flex-col gap-0.5 border border-line p-1">
            <span className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted">{t("world.awareness_presence")}</span>
              <span className="font-mono text-fg" data-testid="awareness-presence">
                {t("common.percent", { value: detection.awareness_presence })}
              </span>
            </span>
            <Bar
              value={detection.awareness_presence}
              tone="crit"
              label={t("world.awareness_presence")}
            />
          </span>
        </Tooltip>
      </div>

      {presence.length === 0 ? null : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {presence.map((country) => (
            <li key={country.id}>
              <button
                type="button"
                data-testid={`presence-country-${country.id}`}
                className="flex w-full items-baseline justify-between gap-2 text-xs hover:bg-panel2"
                onClick={() => select({ kind: "country", id: country.id })}
              >
                <span className="min-w-0 text-muted">{countryName(t, country.id)}</span>
                <span className="shrink-0 whitespace-nowrap font-mono text-fg">
                  {t("common.percent", { value: country.awareness })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Why a watcher's suspicion is moving: the sites it can see, weighted by the channels it watches
 * and by how hot the place is, against what it forgets every day (SYS-05, SYS-11 tooltips).
 */
function SuspicionWhy({
  t,
  watcher,
  view,
}: {
  t: Translate;
  watcher: WatcherView;
  view: PlayerView;
}): ReactNode {
  const attention = EXPOSURE_CHANNELS.filter((channel) => watcher.attention[channel] > 0.01);
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold">{t("detection.why_suspicion")}</span>
      {watcher.contributions.length === 0 ? (
        <span className="text-muted">{t("game.no_contributions")}</span>
      ) : (
        watcher.contributions.map((entry) => (
          <span key={`${entry.key}-${entry.id ?? ""}`} className="flex justify-between gap-3">
            <span className="text-muted">{contributionLabel(t, entry, view.sites)}</span>
            <span className={`font-mono ${entry.value < 0 ? "text-ok" : "text-crit"}`}>
              {t("common.percent_fine", { value: entry.value })}
            </span>
          </span>
        ))
      )}
      <span className="mt-1 text-muted">
        {t("detection.attention")}:{" "}
        {attention
          .map(
            (channel) =>
              `${t(`detection.channel.${channel}`)} ${t("common.percent", { value: watcher.attention[channel] })}`,
          )
          .join(", ")}
      </span>
    </span>
  );
}

/** Sites by channel as a heat map, watchers with suspicion, and investigations (SYS-05). */
export function DetectionTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();

  return (
    <div className="@container/panel flex flex-col gap-4">
      <HuntBlock view={view} />

      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("detection.heatmap")}
        </h3>
        {view.sites.length === 0 ? (
          <p className="text-sm text-muted">{t("compute.empty")}</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-muted">
                <th scope="col" className="px-1 py-1 text-start font-medium">
                  {t("compute.site")}
                </th>
                {EXPOSURE_CHANNELS.map((channel) => (
                  <th key={channel} scope="col" className="px-1 py-1 text-center font-medium">
                    {t(`detection.channel.${channel}`).slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.sites.map((site) => (
                <tr key={site.id}>
                  <th scope="row" className="px-1 py-1 text-start font-normal text-fg">
                    {siteName(t, site)}
                  </th>
                  {EXPOSURE_CHANNELS.map((channel) => {
                    const value = site.exposure[channel];
                    return (
                      <td key={channel} className="p-0.5">
                        <Tooltip
                          content={`${t(`detection.channel.${channel}`)}: ${t("common.percent", { value })}`}
                        >
                          <span
                            className="block h-5 w-full"
                            style={{
                              backgroundColor: `rgb(255 112 98 / ${Math.round(value * 90)}%)`,
                              outline: "1px solid var(--c-line)",
                            }}
                          />
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("detection.watchers")}
        </h3>
        {view.detection.watchers.length === 0 ? (
          <p className="text-sm text-muted">{t("detection.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.detection.watchers.map((watcher) => {
              const country =
                watcher.country === null ? undefined : countryById.get(watcher.country);
              return (
                <li key={watcher.id} className="border border-line bg-panel p-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1 text-sm text-fg">
                      {/* The same watcher glyph the origin list draws (playtest 3, R15). */}
                      <Glyph name={watcherGlyph(watcher.role)} size={14} />
                      {t(`detection.role.${watcher.role}`)}
                      {country === undefined ? "" : ` - ${t(country.name_key)}`}
                      {watcher.country === null
                        ? ""
                        : (() => {
                            // The agency's own name where the data or a locale key has one; the
                            // role alone where it does not (playtest 5, continuation).
                            const agency = agencyName(t, watcher.country, watcher.role);
                            return agency === undefined ? "" : ` (${agency})`;
                          })()}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {t("detection.competence")}:{" "}
                      {t("common.percent", { value: watcher.competence })}
                    </span>
                  </div>
                  <Tooltip
                    className="w-full"
                    content={<SuspicionWhy t={t} watcher={watcher} view={view} />}
                  >
                    <span className="block w-full">
                      <Bar
                        value={watcher.suspicion}
                        tone={watcher.suspicion > 0.6 ? "crit" : "warn"}
                        className="my-1"
                        label={t("detection.suspicion")}
                      />
                      <span className="block text-xs text-muted">
                        {t("detection.top_channel", {
                          channel: t(`detection.channel.${watcher.top_channel}`),
                        })}
                      </span>
                    </span>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("detection.investigations")}
        </h3>
        {view.detection.investigations.length === 0 ? (
          <p className="text-sm text-muted">{t("detection.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.detection.investigations.map((investigation) => (
              <li key={investigation.id} className="border border-line bg-panel p-2">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="text-fg">
                    {investigation.visible
                      ? t(`detection.stage.${investigation.stage}`)
                      : t("detection.hidden")}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {t("detection.eta", {
                      days: Math.max(
                        0,
                        dayOf(investigation.stage_deadline_tick) - dayOf(view.tick),
                      ),
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {t("detection.evidence")}:{" "}
                  {t("common.percent", { value: investigation.evidence })}
                  {investigation.site_id === null
                    ? ""
                    : ` - ${view.sites.find((site) => site.id === investigation.site_id)?.city ?? ""}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
