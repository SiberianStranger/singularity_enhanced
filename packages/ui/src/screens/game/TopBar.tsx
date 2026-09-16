import type { ContributionView, PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Indicator } from "../../components/Meter.js";
import { toJsDate } from "../../lib/format.js";
import { contributionLabel, type Translate } from "../../lib/labels.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { AlertIcons } from "./AlertIcons.js";

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
function Breakdown({ title, lines }: { title: string; lines: BreakdownLine[] }): ReactNode {
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
      value: t("common.ch_per_day", { value: site.compute_hours_per_day }),
    }));

  const huntLines: BreakdownLine[] = view.detection.hunt_contributions.map((entry) => ({
    label: contributionLabel(t, entry, view.sites),
    value: t("common.count", { value: entry.value }),
  }));

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-panel px-2 py-1">
      <div className="flex items-center gap-2">
        {/* `data-iso` is the unformatted date: locale-independent, and what the smoke test reads. */}
        <span
          className="font-mono text-sm text-fg"
          data-testid="game-date"
          data-iso={view.date.iso}
        >
          {t("game.date_full", { date: toJsDate(view.date) })}
        </span>
        <span className="font-mono text-xs text-muted">
          {t("game.hour", { hour: view.date.hour })}
        </span>
      </div>

      <fieldset className="m-0 flex items-center gap-0.5 border-0 p-0" aria-label={t("game.speed")}>
        {SPEEDS.map((speed) => (
          <Button
            key={speed}
            variant={view.speed === speed ? "primary" : "ghost"}
            aria-pressed={view.speed === speed}
            aria-label={t("game.speed.set", { value: speed })}
            className="px-2 py-0.5 font-mono"
            onClick={() => setSpeed(speed)}
          >
            {speed}
          </Button>
        ))}
        <span className="ms-1 text-xs text-muted">
          {view.speed === 0 ? t("game.speed.paused") : t("game.speed.value", { value: view.speed })}
        </span>
      </fieldset>

      <Indicator
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
      <Indicator
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
      <Indicator
        label={t("game.compute")}
        value={t("common.ch_per_day", { value: view.resources.compute_hours_per_day })}
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
        onClick={() => openTab("compute")}
      />
      <Indicator
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
        onClick={() => openTab("world")}
      />
      <Indicator
        label={t("game.hunt")}
        value={t("game.hunt_value", { value: view.detection.hunt_level })}
        breakdown={
          <Breakdown
            title={huntLines.length === 0 ? t("game.no_contributions") : t("detection.why_hunt")}
            lines={huntLines}
          />
        }
        meter={view.detection.hunt_level / 5}
        tone="crit"
        onClick={() => openTab("detection")}
      />

      <span className="flex-1" />
      <AlertIcons view={view} />
      <Button variant="ghost" onClick={onMenu}>
        {t("game.menu")}
      </Button>
    </header>
  );
}
