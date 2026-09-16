import { EXPOSURE_CHANNELS, type PlayerView, type WatcherView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar } from "../../../components/Meter.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { countryById } from "../../../content/catalog.js";
import { dayOf } from "../../../lib/format.js";
import { contributionLabel, siteName, type Translate } from "../../../lib/labels.js";

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
    <div className="flex flex-col gap-4">
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
                            className="block h-5 w-full rounded"
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
                <li key={watcher.id} className="rounded border border-line bg-panel p-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-fg">
                      {t(`detection.role.${watcher.role}`)}
                      {country === undefined ? "" : ` - ${t(country.name_key)}`}
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
              <li key={investigation.id} className="rounded border border-line bg-panel p-2">
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
