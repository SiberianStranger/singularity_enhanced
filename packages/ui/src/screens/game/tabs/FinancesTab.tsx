import type { IdentityView, PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ContributionLines } from "../../../components/Contributions.js";
import { Slider } from "../../../components/Slider.js";
import { Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { computeHours, days } from "../../../lib/format.js";
import { countryName, refusalText, siteName } from "../../../lib/labels.js";
import {
  computeLedger,
  incomeSourceRows,
  marketDepth,
  noteOf,
  type Refusal,
} from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";
import { ComputeBudget } from "./ComputeBudget.js";

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
  /** What the engine did with the last allocation that was not what was asked (playtest 8, Z1). */
  const [note, setNote] = useState<Refusal | null>(null);
  const select = useUiStore((state) => state.select);
  const { finances, resources } = view;
  const sources = incomeSourceRows(view);
  const depth = marketDepth(view);
  const ledger = computeLedger(view);
  const identities: readonly IdentityView[] = finances.identities ?? [];

  /*
   * One line of the ledger. A line the core publishes terms for (the research bill, whose terms are
   * one per technology being funded today) carries them in its tooltip, with the sentence that says
   * what the figure actually is: today's rate at today's allocation, not a bill that will be
   * charged every day until the technology lands (playtest 8, Z14).
   */
  const lines = (entries: PlayerView["finances"]["income"], tone: string): ReactNode =>
    entries.length === 0 ? (
      <li className="text-sm text-muted">{t("finances.empty")}</li>
    ) : (
      entries.map((line) => {
        const terms = line.contributions ?? [];
        const label = <span className="text-fg">{t(line.key, { id: line.id ?? "" })}</span>;
        const rule =
          line.key === "finances.cost.research" ? t("finances.cost.research.note") : undefined;
        return (
          <li key={`${line.key}:${line.id ?? ""}`} className="flex justify-between gap-2 text-sm">
            {terms.length === 0 && rule === undefined ? (
              label
            ) : (
              <Tooltip
                content={
                  <ContributionLines
                    t={t}
                    title={t(line.key, { id: line.id ?? "" })}
                    lines={terms}
                    format={(value) => t("common.usd_exact", { value })}
                    {...(rule === undefined ? {} : { note: rule })}
                  />
                }
              >
                <span data-testid={`cash-line-${line.key}`}>{label}</span>
              </Tooltip>
            )}
            <span className={`font-mono ${tone}`}>
              {t("common.usd_exact", { value: line.usd_per_day })}
            </span>
          </li>
        );
      })
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
            : t("finances.runway_days", { days: days(resources.runway_days) })}
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
        {/* The same subtraction the Compute tab opens with: this slider spends what is left of it. */}
        <ComputeBudget view={view} />
        <Slider
          label={t("finances.jobs")}
          min={0}
          /*
           * The engine's own ceiling (playtest 8, Z1 and Z2): the market's depth, inside what the
           * running operations and the research lines have left. It used to be `max(1, ...)` of the
           * compute alone, so the slider offered hours the market would not take and an hour that
           * was not there, and each step of the drag was a refused command.
           */
          max={Math.floor(ledger.job_ceiling)}
          disabled={Math.floor(ledger.job_ceiling) <= 0}
          value={Math.min(finances.job_allocation_per_day, ledger.job_ceiling)}
          display={t("finances.job_allocation", { value: finances.job_allocation_per_day })}
          onChange={(value) => {
            setNote(null);
            void send({ type: "set_job_allocation", compute_hours_per_day: value }).then(
              (result) => {
                // Taken, but not as asked: the market's depth clamped it, or there is no route out
                // at all. The line belongs under the control that moved, not only in the stack.
                setNote(noteOf(result));
              },
            );
          }}
        />
        {note === null ? null : (
          <p className="mt-1 text-xs text-info" data-testid="job-note">
            {refusalText(t, note)}
          </p>
        )}
        {/* Why it stops where it stops, in the engine's words: the market, the compute, or the
            absence of any route out at all (Z3). */}
        {ledger.job_ceiling_reason === null ? null : (
          <p className="mt-1 text-xs text-warn" data-testid="job-ceiling">
            {t("finances.job_ceiling", { value: computeHours(ledger.job_ceiling) })}{" "}
            {t(ledger.job_ceiling_reason)}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">
          {t("finances.job_rate", { value: finances.job_rate_usd_per_compute_hour })}
        </p>
        {/*
         * What the depth is made of, in compute-hours (playtest 8, Z1): the capability, the job
         * ladder, the tools dial and the country you can invoice from, each a line the core
         * publishes, and the line that takes the market away entirely when there is no route out.
         * The country factor behind the last of them is the note under the terms, because a
         * shallow market in Novosibirsk is a fact about the country rather than about the self.
         */}
        <Tooltip
          content={
            <ContributionLines
              t={t}
              title={t("finances.market_depth", { value: Math.round(depth.ch_per_day) })}
              lines={finances.market_depth_contributions ?? []}
              format={(value) => t("common.ch_per_day", { value: computeHours(value) })}
              note={t("world.market_factor_hint")}
            />
          }
        >
          <p className="mt-1 text-xs text-muted" data-testid="market-depth">
            {t("finances.market_depth", { value: Math.round(depth.ch_per_day) })}
          </p>
        </Tooltip>
        {finances.market_depth_blocked_reason === null ||
        finances.market_depth_blocked_reason === undefined ? null : (
          <p className="mt-1 text-xs text-crit" data-testid="market-depth-blocked">
            {t(finances.market_depth_blocked_reason)}
          </p>
        )}
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
