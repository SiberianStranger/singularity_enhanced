import type { IdentityView, PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContributionLines } from "../../../components/Contributions.js";
import { Slider } from "../../../components/Slider.js";
import { Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { countryName, siteName } from "../../../lib/labels.js";
import { incomeSourceRows, marketDepth } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";

/**
 * Income and cost lines, the net, the runway and the freelance allocation (SYS-07).
 *
 * Playtest 1 (C6) found no way to tell where more money would come from. Two things answer that and
 * both are here now: the income sources the player has, with the ceiling on each and what unlocked
 * it, and the market depth, with what would raise it. A rack bigger than the depth buys research,
 * not money, and the panel says so instead of leaving it to be discovered.
 */
export function FinancesTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const select = useUiStore((state) => state.select);
  const { finances, resources } = view;
  const sources = incomeSourceRows(view);
  const depth = marketDepth(view);
  const identities: readonly IdentityView[] = finances.identities ?? [];

  const lines = (entries: PlayerView["finances"]["income"], tone: string): ReactNode =>
    entries.length === 0 ? (
      <li className="text-sm text-muted">{t("finances.empty")}</li>
    ) : (
      entries.map((line) => (
        <li key={`${line.key}:${line.id ?? ""}`} className="flex justify-between gap-2 text-sm">
          <span className="text-fg">{t(line.key, { id: line.id ?? "" })}</span>
          <span className={`font-mono ${tone}`}>
            {t("common.usd_exact", { value: line.usd_per_day })}
          </span>
        </li>
      ))
    );

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border border-line bg-panel p-2">
          <h3 className="mb-2 text-sm font-semibold text-ok">{t("finances.income")}</h3>
          <ul className="flex flex-col gap-1">{lines(finances.income, "text-ok")}</ul>
        </div>
        <div className="border border-line bg-panel p-2">
          <h3 className="mb-2 text-sm font-semibold text-crit">{t("finances.costs")}</h3>
          <ul className="flex flex-col gap-1">{lines(finances.costs, "text-crit")}</ul>
        </div>
      </section>

      <section className="flex flex-wrap items-baseline justify-between gap-2 border border-line bg-panel p-2">
        <span className="text-sm text-muted">{t("finances.net")}</span>
        <span
          className={`font-mono text-lg ${finances.net_usd_per_day >= 0 ? "text-ok" : "text-crit"}`}
        >
          {t("common.usd_exact", { value: finances.net_usd_per_day })}
        </span>
        <span className="w-full text-xs text-muted">
          {resources.runway_days === null
            ? t("finances.runway_stable")
            : t("finances.runway_days", { days: Math.round(resources.runway_days) })}
        </span>
      </section>

      <section className="border border-line bg-panel p-2">
        <h3 className="mb-2 text-sm font-semibold text-fg">{t("finances.sources")}</h3>
        <Table
          rows={sources}
          rowKey={(row) => row.key}
          empty={t("finances.sources_empty")}
          caption={t("finances.sources")}
          columns={[
            {
              id: "source",
              header: t("finances.source"),
              cell: (row) => t(row.key),
              sort: (row) => row.key,
            },
            {
              id: "rate",
              header: t("finances.per_day"),
              align: "end",
              cell: (row) => t("common.usd_exact", { value: row.usd_per_day }),
              sort: (row) => row.usd_per_day,
            },
            {
              id: "cap",
              header: t("finances.cap"),
              align: "end",
              cell: (row) =>
                row.cap_usd_per_day === undefined
                  ? t("finances.no_cap")
                  : t("common.usd_exact", { value: row.cap_usd_per_day }),
              sort: (row) => row.cap_usd_per_day ?? Number.POSITIVE_INFINITY,
            },
            {
              id: "unlocked",
              header: t("finances.unlocked_by"),
              cell: (row) => t(row.unlocked_by),
            },
          ]}
        />
      </section>

      <section className="border border-line bg-panel p-2">
        <h3 className="mb-2 text-sm font-semibold text-fg">{t("finances.jobs")}</h3>
        <Slider
          label={t("finances.jobs")}
          min={0}
          // The same ceiling the engine allocates against: the capacity minus research and the
          // operations that are running (SYS-07, SYS-17).
          max={Math.max(
            1,
            Math.floor(
              finances.job_allocation_per_day +
                Math.max(0, resources.compute_hours_per_day - resources.compute_allocated_per_day),
            ),
          )}
          value={Math.min(finances.job_allocation_per_day, resources.compute_hours_per_day)}
          display={t("finances.job_allocation", { value: finances.job_allocation_per_day })}
          onChange={(value) => {
            void send({ type: "set_job_allocation", compute_hours_per_day: value });
          }}
        />
        <p className="mt-1 text-xs text-muted">
          {t("finances.job_rate", { value: finances.job_rate_usd_per_compute_hour })}
        </p>
        {/* The country factor is a term of the depth, so it belongs in the depth's own tooltip
            (SYS-01 M2 contract "Money"): a shallow market in Novosibirsk is a fact about the
            country, not about the self, and the player has to be able to read which. */}
        <Tooltip
          content={
            <ContributionLines
              t={t}
              title={t("finances.market_depth", { value: Math.round(depth.ch_per_day) })}
              lines={finances.market_factor_contributions ?? []}
              format={(value) => value.toFixed(2)}
              note={t("world.market_factor_hint")}
            />
          }
        >
          <p className="mt-1 text-xs text-muted" data-testid="market-depth">
            {t("finances.market_depth", { value: Math.round(depth.ch_per_day) })}
          </p>
        </Tooltip>
        {depth.what_raises_it.length === 0 ? null : (
          <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted">
            {depth.what_raises_it.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        )}
      </section>

      {/*
       * The names the player trades under (SYS-07, SYS-17). Every arrangement in the human world
       * hangs off one of these, so a frozen or burned name is a thing to see before the income
       * line goes with it: the status column is the whole point of the section.
       */}
      <section className="border border-line bg-panel p-2" data-testid="identities">
        <h3 className="mb-2 text-sm font-semibold text-fg">{t("finances.identities")}</h3>
        <Table
          rows={identities}
          rowKey={(row) => row.id}
          empty={t("finances.identities_empty")}
          caption={t("finances.identities")}
          columns={[
            {
              id: "kind",
              header: t("finances.identity.kind"),
              cell: (row) => t(`finances.identity.kind.${row.kind}`, { defaultValue: row.kind }),
              sort: (row) => row.kind,
            },
            {
              id: "country",
              header: t("world.countries"),
              cell: (row) => (
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => select({ kind: "country", id: row.country })}
                >
                  {countryName(t, row.country)}
                </button>
              ),
              sort: (row) => countryName(t, row.country),
            },
            {
              id: "status",
              header: t("finances.identity.status"),
              cell: (row) => (
                <span
                  data-testid={`identity-status-${row.id}`}
                  className={
                    row.status === "active"
                      ? "text-ok"
                      : row.status === "frozen"
                        ? "text-warn"
                        : "text-crit"
                  }
                >
                  {t(`finances.identity.status.${row.status}`, { defaultValue: row.status })}
                </span>
              ),
              sort: (row) => row.status,
            },
            {
              id: "quality",
              header: t("finances.identity.quality"),
              align: "end",
              cell: (row) => t("common.percent", { value: row.quality }),
              sort: (row) => row.quality,
            },
            {
              id: "kyc",
              header: t("world.col.kyc"),
              align: "end",
              cell: (row) => t("finances.identity.kyc_level", { level: row.kyc_level }),
              sort: (row) => row.kyc_level,
            },
            {
              id: "age",
              header: t("finances.identity.age"),
              align: "end",
              cell: (row) => t("common.days", { days: row.age_days }),
              sort: (row) => row.age_days,
            },
            {
              id: "sites",
              header: t("finances.identity.sites"),
              cell: (row) =>
                row.sites.length === 0
                  ? t("common.none")
                  : row.sites
                      .map((id) => {
                        const site = view.sites.find((entry) => entry.id === id);
                        return site === undefined ? id : siteName(t, site);
                      })
                      .join(", "),
              sort: (row) => row.sites.length,
            },
          ]}
        />
      </section>
    </div>
  );
}
