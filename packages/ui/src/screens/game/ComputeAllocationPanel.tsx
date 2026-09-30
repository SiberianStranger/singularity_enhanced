import {
  type ComputeAllocationPlan,
  type PlayerView,
  planComputeAllocation,
} from "@singularity/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Glyph, type GlyphName } from "../../components/glyphs.js";
import { Tooltip } from "../../components/Tooltip.js";
import { computeHours } from "../../lib/format.js";
import { contributionLabel, refusalText, siteName } from "../../lib/labels.js";
import { computeLedger } from "../../lib/viewContract.js";
import { useGameStore } from "../../store/gameStore.js";

/**
 * The three shares of what the running operations leave (control room): research, paid work and
 * free compute. Moving one previews the whole plan with the engine's own `planComputeAllocation`,
 * which rescales the other two in their proportion, and the plan goes to the engine as one
 * `set_compute_allocations` 180 ms after the last move, or when the sheet closes, so a drag is one
 * command rather than one per step (playtest 8, Z2). The research slider is disabled until the
 * player picks a line, since the engine never picks a first technology, and the lines it carries
 * are the ones the command accepts (`compute.research_targets`), so a lapsed one cannot make every
 * move refused.
 */
export function ComputeAllocationPanel({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const ledger = computeLedger(view);
  const capacity = ledger.allocatable;
  const jobsLimit =
    view.compute.job_market_limit_ch_per_day ??
    Math.min(capacity, view.finances.market_depth_ch_per_day);
  const targets =
    view.compute.research_targets ??
    view.research.techs.filter((tech) => tech.allocation_per_day > 0).map((tech) => tech.id);
  const research = Object.fromEntries(
    targets.map((id) => [
      id,
      view.research.techs.find((tech) => tech.id === id)?.allocation_per_day ?? 0,
    ]),
  );
  const baseline: ComputeAllocationPlan = { research, jobs: ledger.jobs, free: ledger.unallocated };
  const [draft, setDraft] = useState<ComputeAllocationPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<ReactNode>(null);
  const pending = useRef<ComputeAllocationPlan | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = draft ?? baseline;
  const totalResearch = Object.values(shown.research).reduce((sum, value) => sum + value, 0);
  const hours = (value: number): string => t("common.ch_per_day", { value: computeHours(value) });
  const clear = (): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const flush = (): void => {
    clear();
    const next = pending.current;
    if (next === null) return;
    pending.current = null;
    setBusy(true);
    setRefused(null);
    void send({
      type: "set_compute_allocations",
      research_ch_per_day: next.research,
      jobs_ch_per_day: next.jobs,
    })
      .then((result) => {
        if (!result.ok && result.error !== undefined) setRefused(refusalText(t, result.error));
      })
      .catch(() => setRefused(t("error.command")))
      .finally(() => {
        setDraft(null);
        setBusy(false);
      });
  };
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      const next = pending.current;
      if (next !== null)
        void send({
          type: "set_compute_allocations",
          research_ch_per_day: next.research,
          jobs_ch_per_day: next.jobs,
        });
    },
    [send],
  );
  const preview = (target: "research" | "jobs" | "free", percent: number): void => {
    const next = planComputeAllocation({
      capacity,
      jobsLimit,
      research: shown.research,
      jobs: shown.jobs,
      target,
      value: (capacity * percent) / 100,
    });
    setDraft(next);
    pending.current = next;
    clear();
    timer.current = setTimeout(flush, 180);
  };
  const availableTip = (
    <span className="flex flex-col gap-1">
      <span className="flex justify-between gap-4">
        <span>{t("self_ui.total_compute")}</span>
        <span>{hours(ledger.capacity)}</span>
      </span>
      {ledger.reservations.map((line) => (
        <span key={line.instance_id} className="flex justify-between gap-4">
          <span>{t(line.name_key)}</span>
          <span>−{hours(line.ch_per_day)}</span>
        </span>
      ))}
      <span className="flex justify-between gap-4 border-t border-line pt-1">
        <span>{t("self_ui.available_compute")}</span>
        <span>{hours(capacity)}</span>
      </span>
    </span>
  );
  const jobsTip = (
    <span className="flex flex-col gap-1">
      <span>{t("self_ui.jobs_tip")}</span>
      {view.finances.market_depth_contributions.map((line) => (
        <span className="flex justify-between gap-4" key={`${line.key}-${line.id ?? "total"}`}>
          <span>{contributionLabel(t, line, view.sites)}</span>
          <span>{hours(line.value)}</span>
        </span>
      ))}
      <span className="border-t border-line pt-1">
        {t("compute.budget.job_ceiling", { value: computeHours(jobsLimit) })}
      </span>
      {view.finances.market_depth_blocked_reason === null ? null : (
        <span>{t(view.finances.market_depth_blocked_reason)}</span>
      )}
    </span>
  );
  const rows: {
    id: "research" | "jobs" | "free";
    icon: GlyphName;
    value: number;
    tip: ReactNode;
  }[] = [
    {
      id: "research",
      icon: "watcher_lab",
      value: totalResearch,
      tip: (
        <span className="flex flex-col gap-1">
          <span>{t("self_ui.research_tip")}</span>
          {Object.keys(shown.research).map((id) => (
            <span key={id}>
              {t(view.research.techs.find((tech) => tech.id === id)?.name_key ?? id)}:{" "}
              {hours(shown.research[id] ?? 0)}
            </span>
          ))}
          {Object.keys(shown.research).length === 0 ? (
            <span>{t("self_ui.choose_research")}</span>
          ) : null}
        </span>
      ),
    },
    { id: "jobs", icon: "cash", value: shown.jobs, tip: jobsTip },
    { id: "free", icon: "compute", value: shown.free, tip: t("self_ui.free_tip") },
  ];
  const totalTip = (
    <span className="flex flex-col gap-1">
      {view.compute.contributions.map((line) => {
        const site = view.sites.find((entry) => entry.id === line.id);
        const channel = view.compute.channels.find((entry) => entry.id === line.id);
        return (
          <span className="flex justify-between gap-4" key={line.id ?? line.key}>
            <span>
              {site !== undefined
                ? siteName(t, site)
                : channel !== undefined
                  ? t(channel.name_key)
                  : t(line.key)}
            </span>
            <span>{hours(line.value)}</span>
          </span>
        );
      })}
    </span>
  );
  /*
   * The maintainer's layout (control room): on the left the whole capacity and what is left of it
   * once the operations have taken theirs, each an icon and a figure; on the right the three
   * shares one above the other, each with its slider beside it and its figure after it. Why a
   * figure is what it is, including the market that takes no more paid work, is the figure's
   * tooltip and nothing on the screen itself.
   */
  return (
    <section
      data-testid="compute-allocation-panel"
      aria-label={t("self_ui.compute")}
      className="grid min-w-0 gap-x-4 gap-y-2 border-t border-line pt-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)]"
    >
      <div className="flex min-w-0 flex-col gap-2">
        {(
          [
            ["total", "compute", "self_ui.total_compute", ledger.capacity, totalTip],
            ["available", "power", "self_ui.available_compute", capacity, availableTip],
          ] as const
        ).map(([id, icon, label, value, tip]) => (
          <Tooltip key={id} className="w-full" content={tip}>
            <button
              type="button"
              data-testid={`compute-${id}-figure`}
              className="grid w-full min-w-0 cursor-help grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-2 text-start"
            >
              <Glyph name={icon} size={24} className="row-span-2 text-muted" />
              <span className="min-w-0 font-sans text-xs text-muted">{t(label)}</span>
              <strong data-testid={`compute-${id}`} className="font-mono text-base text-fg">
                {hours(value)}
              </strong>
            </button>
          </Tooltip>
        ))}
      </div>
      {/* One grid for the three rows, so the sliders line up under one another. */}
      <div className="grid min-w-0 grid-cols-[minmax(6.5rem,0.9fr)_minmax(5rem,1.3fr)_auto] content-start items-center gap-x-2 gap-y-1.5">
        {rows.map((row) => (
          <div key={row.id} className="contents" data-testid={`allocation-row-${row.id}`}>
            <label
              htmlFor={`allocation-${row.id}`}
              className="flex min-w-0 items-center gap-1.5 font-sans text-xs text-fg"
            >
              <Glyph name={row.icon} size={16} className="shrink-0 text-muted" />
              <span className="min-w-0 break-words">{t(`self_ui.allocation.${row.id}`)}</span>
            </label>
            <input
              id={`allocation-${row.id}`}
              data-testid={`allocation-${row.id}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={capacity > 0 ? (row.value / capacity) * 100 : 0}
              aria-valuetext={hours(row.value)}
              disabled={
                busy ||
                capacity <= 0 ||
                (row.id === "research" && Object.keys(shown.research).length === 0) ||
                (row.id === "jobs" && jobsLimit <= 0)
              }
              className="block w-full min-w-0 accent-[var(--c-accent)]"
              onChange={(event) => preview(row.id, Number(event.target.value))}
              onPointerUp={flush}
              onKeyUp={flush}
              onBlur={flush}
            />
            <Tooltip content={row.tip} side="bottom">
              <button
                type="button"
                className="cursor-help text-end"
                data-testid={`allocation-value-${row.id}`}
              >
                <span className="whitespace-nowrap font-mono text-sm text-fg">
                  {hours(row.value)}
                </span>
              </button>
            </Tooltip>
            {row.id === "research" ? (
              <select
                className="col-span-2 col-start-2 mt-0.5 w-full min-w-0 border border-line bg-panel2 p-1 text-xs"
                aria-label={t("self_ui.research_target")}
                data-testid="allocation-research-target"
                value={targets.length > 1 ? "__portfolio" : (targets[0] ?? "")}
                disabled={busy}
                onChange={(event) => {
                  const id = event.target.value;
                  if (id === "__portfolio") return;
                  const next = {
                    research: id === "" ? {} : { [id]: totalResearch },
                    jobs: shown.jobs,
                    free: shown.free + (id === "" ? totalResearch : 0),
                  };
                  setDraft(next);
                  pending.current = next;
                  flush();
                }}
              >
                <option value="">{t("self_ui.choose_research")}</option>
                {targets.length > 1 ? (
                  <option value="__portfolio">
                    {t("self_ui.research_portfolio", { count: targets.length })}
                  </option>
                ) : null}
                {view.research.techs
                  .filter((tech) => tech.status === "available" || tech.status === "in_progress")
                  .map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {t(tech.name_key)}
                    </option>
                  ))}
              </select>
            ) : null}
          </div>
        ))}
        {refused === null ? null : (
          <p role="alert" className="col-span-3 text-xs text-crit">
            {refused}
          </p>
        )}
      </div>
    </section>
  );
}
