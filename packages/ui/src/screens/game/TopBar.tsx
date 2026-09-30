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

/**
 * The buttons at the bar's end: the angular face's small step and a little less padding, with the
 * important flag because the button's own `text-sm` and `px-2` come later in the stylesheet.
 */
const CORNER_BUTTON = "px-1.5! text-xs!";

type DropCell = "attention" | "awareness" | "hunt" | "icons" | "runway" | "meters" | "speed";

/**
 * Below which width of the bar each droppable cell goes, first to last (playtest 10, V7). The order
 * is the same in every language; the widths are not, so English, the narrowest language the game
 * ships, has its own measured set, and every other language is held to Russian's, the widest. Each
 * figure is the cells before it at the widths a long run reaches, plus this cell, plus a margin.
 * The class names are written out in full so the stylesheet can be generated from them.
 */
const DROP: Readonly<Record<"compact" | "wide", Readonly<Record<DropCell, string>>>> = {
  compact: {
    attention: "@max-[57rem]/topbar:hidden",
    awareness: "@max-[60.5rem]/topbar:hidden",
    hunt: "@max-[66rem]/topbar:hidden",
    icons: "@max-[69.5rem]/topbar:hidden",
    runway: "@max-[75rem]/topbar:hidden",
    meters: "@max-[79.5rem]/topbar:hidden",
    speed: "@max-[83rem]/topbar:hidden",
  },
  wide: {
    attention: "@max-[62rem]/topbar:hidden",
    awareness: "@max-[66rem]/topbar:hidden",
    hunt: "@max-[72rem]/topbar:hidden",
    icons: "@max-[75rem]/topbar:hidden",
    runway: "@max-[81rem]/topbar:hidden",
    meters: "@max-[86rem]/topbar:hidden",
    speed: "@max-[89rem]/topbar:hidden",
  },
};

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
  const { t, i18n } = useTranslation();
  const drop = DROP[i18n.language === "en" ? "compact" : "wide"];
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
     * the screen and the page grew a scrollbar of its own. The row is a query container, and as
     * it runs out of width it drops what the player can get elsewhere. Nothing here scrolls.
     *
     * Since playtest 10 (V7) the bar starts where the portrait in the corner ends, so it is the
     * screen less `--corner-w`: 70 rem at 1920 by 1080 and 58 rem at 1280 by 720 on auto. Every cell
     * is a glyph and a figure with its name in the tooltip's first line and in the accessible name,
     * and the order it gives things up in was worked out again for the shorter bar (`DROP`, with
     * the widths it was measured at), first to last:
     *
     *   the written speed, which the pressed button already says;
     *   the gauges beside the compute, awareness and hunt figures, which repeat them;
     *   the runway, which is the cash tooltip's first line;
     *   the alert icons, whose alerts the bell lists;
     *   the hunt level, which has the Detection tab and an alert icon when it moves;
     *   the awareness, which has the world ledger and an alert of its own;
     *   the attention, which is what the Actions tab spends.
     *
     * The clock, the speed, the cash, the compute, the bell, the journal, knowledge and the menu
     * never go: at 1280 by 720 they are the bar, 54 of its 58 rem on the first day. The date sits
     * over the clock rather than beside it, and the three buttons at the end are on the angular
     * face's small step, which is what makes them fit there. A screen narrower than 79 rem (a
     * pinned interface scale in a small window) cannot spare the corner, so there the bar takes
     * the whole width again and the portrait goes back under it.
     */
    <header className="@container/topbar relative z-20 col-span-3 col-start-1 row-start-1 ms-[var(--corner-w)] flex min-w-0 shrink-0 items-center gap-x-0.5 border-b border-line bg-panel px-2 py-0.5 @max-[79rem]/screen:ms-0">
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
            style={{ paddingInline: "0.25rem" }}
            onClick={() => setSpeed(speed)}
          >
            {speed}
          </Button>
        ))}
        <span className={`ms-1 text-xs text-muted ${drop.speed}`}>
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
      {/* The first cell the bar gives up when it is short of width: the same number is the
          headline of the cash gauge's own tooltip (L5). */}
      <span className={`flex border-s border-line/50 ${drop.runway}`}>
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
          meterClassName={drop.meters}
          onClick={() => openTab("overview")}
        />
      </span>
      {/*
       * Attention, awareness and the hunt level live here rather than in the self sheet (control
       * room): the sheet is about what the model is, the bar about what it has in hand. When the
       * bar runs short of width they go last-first: the hunt level and the awareness each have a
       * panel of their own and an alert icon in this bar when they move, and attention is what
       * the Actions tab spends.
       */}
      <span className={`flex border-s border-line/50 ${drop.attention}`}>
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
          onClick={() => openTab("actions")}
        />
      </span>
      <span className={`flex border-s border-line/50 ${drop.awareness}`}>
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
          meterClassName={drop.meters}
          tone="warn"
          onClick={() => toggleOverlay("world")}
        />
      </span>
      <span className={`flex border-s border-line/50 ${drop.hunt}`}>
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
          meterClassName={drop.meters}
          tone="crit"
          onClick={() => openTab("detection")}
        />
      </span>

      <span className="flex-1" />
      <AlertIcons view={view} iconsClassName={drop.icons} />
      {/*
       * The journal and knowledge open from the top-right corner as windows (playtest 3, R9;
       * playtest 10, V6): the journal to the left of Knowledge. The three buttons are on the
       * angular face's small step, which keeps them in the bar at 1280 by 720.
       */}
      <Button
        variant="ghost"
        hotkey={accelerator(t, "panel.journal")}
        registerKey={false}
        data-testid="open-journal"
        className={CORNER_BUTTON}
        onClick={() => toggleOverlay("journal")}
      >
        {t("panel.journal")}
      </Button>
      <Button
        variant="ghost"
        hotkey={accelerator(t, "panel.knowledge")}
        registerKey={false}
        data-testid="open-knowledge"
        className={CORNER_BUTTON}
        onClick={() => toggleOverlay("knowledge")}
      >
        {t("panel.knowledge")}
      </Button>
      <Button
        variant="ghost"
        hotkey={accelerator(t, "game.menu")}
        className={CORNER_BUTTON}
        onClick={onMenu}
      >
        {t("game.menu")}
      </Button>
    </header>
  );
}
