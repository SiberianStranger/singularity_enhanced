import type { ContributionView, PlayerView } from "@singularity/core";
import { EXPOSED_AWARENESS, EXPOSED_DAYS, EXPOSED_HUNT_LEVEL } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Glyph } from "../../components/glyphs.js";
import { Indicator } from "../../components/Meter.js";
import { accelerator } from "../../lib/accelerators.js";
import { computeHours } from "../../lib/format.js";
import { contributionLabel, type Translate } from "../../lib/labels.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { AlertIcons } from "./AlertIcons.js";
import { GameClock } from "./GameClock.js";

const SPEEDS = [0, 1, 2, 3, 4, 5] as const;

interface TopBarProps {
  view: PlayerView;
  onMenu(): void;
}

interface BreakdownLine {
  label: string;
  value: string;
}

/**
 * A gauge's tooltip: a headline and the terms behind the number, as Paradox panels do it. Every
 * line is already localized by the caller, so this only lays them out.
 */
function Breakdown({
  title,
  lines,
  note,
}: {
  title: string;
  lines: BreakdownLine[];
  /** A sentence under the terms: the rule behind them, or the threshold they are heading for. */
  note?: ReactNode;
}): ReactNode {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold">{title}</span>
      {lines.length === 0 ? null : (
        <span className="flex flex-col gap-0.5">
          {lines.map((line) => (
            <span key={`${line.label}-${line.value}`} className="flex justify-between gap-3">
              <span className="text-muted">{line.label}</span>
              <span className="font-mono">{line.value}</span>
            </span>
          ))}
        </span>
      )}
      {note === undefined ? null : <span className="mt-1 text-muted">{note}</span>}
    </span>
  );
}

function percentLines(
  t: Translate,
  view: PlayerView,
  contributions: readonly ContributionView[],
): BreakdownLine[] {
  return contributions.map((entry) => ({
    label: contributionLabel(t, entry, view.sites),
    value: t("common.percent", { value: entry.value }),
  }));
}

/** Date and speed, resources, the two gauges, the alert icons and the bell (SYS-11 "Alert bar"). */
export function TopBar({ view, onMenu }: TopBarProps): ReactNode {
  const { t } = useTranslation();
  const setSpeed = useGameStore((state) => state.setSpeed);
  const openTab = useUiStore((state) => state.openTab);
  const toggleOverlay = useUiStore((state) => state.toggleOverlay);
  const runway = view.resources.runway_days;

  const cashLines: BreakdownLine[] = [
    ...view.finances.income.map((line) => ({
      label: t(line.key),
      value: t("common.usd_exact", { value: line.usd_per_day }),
    })),
    ...view.finances.costs.map((line) => ({
      label: t(line.key),
      value: t("common.usd_exact", { value: -line.usd_per_day }),
    })),
  ];

  const computeLines: BreakdownLine[] = view.sites
    .filter((site) => site.compute_hours_per_day > 0)
    .map((site) => ({
      label: contributionLabel(
        t,
        { key: "detection.contribution.site", id: site.id, value: 0 },
        view.sites,
      ),
      value: t("common.ch_per_day", { value: computeHours(site.compute_hours_per_day) }),
    }));

  const huntLines: BreakdownLine[] = view.detection.hunt_contributions.map((entry) => ({
    label: contributionLabel(t, entry, view.sites),
    value: t("common.count", { value: entry.value }),
  }));

  return (
    /*
     * One flat row that fits (playtest 5, L5). It used to scroll sideways, which is not a way of
     * fitting: at 1366 the bar needed 1,484 px, so the run's clock or its menu was off the end of
     * the screen and the page grew a scrollbar of its own. The row is a query container now, and
     * as it runs out of width it drops what the player can get elsewhere, in order: the written
     * speed (the pressed button already says it), then the runway, which is the cash tooltip's
     * first line, then the hunt level and the awareness, each of which has a panel of its own and
     * an alert icon in this same bar when it moves. The clock, the speed and the cash never go.
     * Nothing here scrolls.
     *
     * The thresholds moved up with the angular face (playtest 6, X12), and the control room
     * changed what a cell is: a glyph and a number, with the name in the tooltip's first line and
     * in the accessible name, and a thin rule between cells. The written names come back only on
     * a bar wide enough for all of them in Russian, which none of the supported sizes is, so at
     * 1280 by 720 the bar carries the attention, the awareness and the hunt level as well as the
     * money and the compute. A pinned interface scale drops them again, hunt level first.
     */
    <header className="@container/topbar flex shrink-0 items-center gap-x-0.5 border-b border-line bg-panel px-2 py-0.5">
      <GameClock />

      <fieldset className="m-0 flex items-center gap-0.5 border-0 p-0" aria-label={t("game.speed")}>
        {SPEEDS.map((speed) => (
          <Button
            key={speed}
            variant={view.speed === speed ? "primary" : "ghost"}
            aria-pressed={view.speed === speed}
            aria-label={t("game.speed.set", { value: speed })}
            className="py-0 font-mono"
            // As a style: `px-1` loses to the button's own `px-2` by stylesheet order.
            style={{ paddingInline: "0.3125rem" }}
            onClick={() => setSpeed(speed)}
          >
            {speed}
          </Button>
        ))}
        <span className="ms-1 text-xs text-muted @max-[96rem]/topbar:hidden">
          {view.speed === 0 ? t("game.speed.paused") : t("game.speed.value", { value: view.speed })}
        </span>
      </fieldset>

      <span className="flex border-s border-line/50">
        <Indicator
          icon={<Glyph name="cash" size={16} />}
          labelClassName="@max-[124rem]/topbar:hidden"
          label={t("game.cash")}
          value={t("common.usd", { value: view.resources.cash_usd })}
          trend={view.resources.cash_delta_usd_per_day}
          breakdown={
            <Breakdown
              title={t("common.per_day", {
                value: t("common.usd_exact", { value: view.resources.cash_delta_usd_per_day }),
              })}
              lines={cashLines}
            />
          }
          onClick={() => openTab("finances")}
        />
      </span>
      {/* The first thing the bar gives up when it is short of width: the same number is the
          headline of the cash gauge's own tooltip (L5). */}
      <span className="flex border-s border-line/50 @max-[88rem]/topbar:hidden">
        <Indicator
          icon={<Glyph name="power" size={16} />}
          labelClassName="@max-[124rem]/topbar:hidden"
          label={t("game.runway")}
          value={
            runway === null
              ? t("game.runway_stable")
              : t("game.runway_days", { days: Math.round(runway) })
          }
          breakdown={
            <Breakdown
              title={t("game.runway_explained", {
                cash: t("common.usd_exact", { value: view.resources.cash_usd }),
                net: t("common.usd_exact", { value: view.resources.cash_delta_usd_per_day }),
              })}
              lines={cashLines}
            />
          }
          onClick={() => openTab("finances")}
        />
      </span>
      <span className="flex border-s border-line/50">
        <Indicator
          icon={<Glyph name="compute" size={16} />}
          labelClassName="@max-[124rem]/topbar:hidden"
          label={t("game.compute")}
          value={t("common.ch_per_day", {
            value: computeHours(view.resources.compute_hours_per_day),
          })}
          breakdown={
            <Breakdown
              title={t("game.compute_alloc", {
                used: view.resources.compute_allocated_per_day,
                total: view.resources.compute_hours_per_day,
              })}
              lines={computeLines}
            />
          }
          meter={
            view.resources.compute_hours_per_day <= 0
              ? 0
              : view.resources.compute_allocated_per_day / view.resources.compute_hours_per_day
          }
          onClick={() => openTab("overview")}
        />
      </span>
      {/*
       * Attention, awareness and the hunt level live here rather than in the self sheet (control
       * room): the sheet is about what the model is, the bar about what it has in hand. When the
       * bar runs short of width they go last-first: the hunt level and the awareness each have a
       * panel of their own and an alert icon in this bar when they move, and attention is the
       * Operations tab's own headline.
       */}
      <span className="flex border-s border-line/50 @max-[66rem]/topbar:hidden">
        <Indicator
          icon={<Glyph name="attention" size={16} />}
          labelClassName="@max-[124rem]/topbar:hidden"
          label={t("game.attention")}
          value={`${view.resources.attention_used} / ${view.resources.attention_total}`}
          breakdown={
            <Breakdown
              title={t("self_ui.attention_tip")}
              lines={view.operations.map((operation) => {
                const offer = view.operation_offers.find(
                  (entry) => entry.id === operation.operation_id,
                );
                return {
                  label: t(offer?.name_key ?? operation.operation_id),
                  value: String(offer?.cost_attention ?? 0),
                };
              })}
            />
          }
          onClick={() => openTab("operations")}
        />
      </span>
      <span className="flex border-s border-line/50 @max-[72rem]/topbar:hidden">
        <Indicator
          icon={<Glyph name="awareness" size={16} />}
          labelClassName="@max-[124rem]/topbar:hidden"
          label={t("game.awareness")}
          value={t("common.percent", { value: view.detection.awareness_global })}
          breakdown={
            <Breakdown
              title={t("detection.why_awareness")}
              lines={percentLines(t, view, view.detection.awareness_contributions)}
            />
          }
          meter={view.detection.awareness_global}
          tone="warn"
          onClick={() => toggleOverlay("world")}
        />
      </span>
      <span className="flex border-s border-line/50 @max-[78rem]/topbar:hidden">
        <Indicator
          icon={<Glyph name="hunt" size={16} />}
          labelClassName="@max-[124rem]/topbar:hidden"
          label={t("game.hunt")}
          value={t("game.hunt_value", { value: view.detection.hunt_level })}
          breakdown={
            /*
             * The gauge says the stage; the tooltip says how fast the world is moving toward the
             * ending that stage leads to (SYS-01 M2 contract, SYS-05 "Global pressure"). The
             * thresholds are the engine's own constants, so the clock is readable rather than
             * guessed at.
             */
            <Breakdown
              title={huntLines.length === 0 ? t("game.no_contributions") : t("detection.why_hunt")}
              lines={[
                ...huntLines,
                {
                  label: t("world.hunt_pressure"),
                  value: t("common.percent", { value: view.detection.hunt_pressure }),
                },
                {
                  label: t("world.awareness_presence"),
                  value: t("common.percent", { value: view.detection.awareness_presence }),
                },
              ]}
              note={t("world.exposed_threshold", {
                awareness: t("common.percent", { value: EXPOSED_AWARENESS }),
                hunt: EXPOSED_HUNT_LEVEL,
                days: EXPOSED_DAYS,
              })}
            />
          }
          meter={view.detection.hunt_level / 5}
          tone="crit"
          onClick={() => openTab("detection")}
        />
      </span>

      <span className="flex-1" />
      <AlertIcons view={view} />
      {/* Knowledge opens from the top-right corner as a window (playtest 3, R9). */}
      <Button
        variant="ghost"
        hotkey={accelerator(t, "panel.knowledge")}
        registerKey={false}
        data-testid="open-knowledge"
        onClick={() => toggleOverlay("knowledge")}
      >
        {t("panel.knowledge")}
      </Button>
      <Button variant="ghost" hotkey={accelerator(t, "game.menu")} onClick={onMenu}>
        {t("game.menu")}
      </Button>
    </header>
  );
}
