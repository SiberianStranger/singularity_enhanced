import type { CountryView, PlayerView } from "@singularity/core";
import { EXPOSED_AWARENESS, EXPOSED_DAYS, EXPOSED_HUNT_LEVEL } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { ContributionLines } from "../../../components/Contributions.js";
import { MapModeIcon } from "../../../components/Icon.js";
import { Bar } from "../../../components/Meter.js";
import { type Column, Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { dayOf } from "../../../lib/format.js";
import { agencyName, countryName, type Translate } from "../../../lib/labels.js";
import { MAP_MODES, type MapMode, useUiStore } from "../../../store/uiStore.js";

/** Pages of the world ledger (SYS-11 amendments, R10). Treaties join them when SYS-08 lands. */
export const LEDGER_TABS = ["countries", "map_modes", "world"] as const;
export type LedgerTab = (typeof LEDGER_TABS)[number];

/**
 * Column sets of the countries table (SYS-01 M2 contract "Views").
 *
 * The contract lists twenty columns a player can act on, and twenty columns of a hundred and five
 * rows do not fit a window at 1280 by 720 without either a sideways scrollbar or headers cut to
 * three letters; both are forbidden (the layout contract, and the style guide's "compacted by
 * narrower columns and abbreviations, never by wrapping numbers"). The table therefore keeps the
 * two columns every set needs (the country and whether the player is there) and switches the rest
 * in families, the way a Paradox ledger has pages: politics, the market, and what the player holds
 * here. Every column of the contract is in exactly one set, sortable, with its map mode.
 */
export const COLUMN_SETS = ["politics", "economy", "presence"] as const;
export type ColumnSet = (typeof COLUMN_SETS)[number];

/** Filter by presence: everything, or only the countries the player is in. */
const PRESENCE_FILTERS = ["all", "presence"] as const;
type PresenceFilter = (typeof PRESENCE_FILTERS)[number];

function percent(t: Translate, value: number): string {
  return t("common.percent", { value });
}

function factor(t: Translate, value: number): string {
  return t("common.times", { value: value.toFixed(2) });
}

/** The button beside a column header that paints the map by that column. */
function MapModeButton({ mode, label }: { mode: MapMode; label: string }): ReactNode {
  const { t } = useTranslation();
  const current = useUiStore((state) => state.mapMode);
  const setMode = useUiStore((state) => state.setMapMode);
  const title = t("world.show_on_map", { column: label });
  return (
    <Tooltip content={title}>
      <button
        type="button"
        data-testid={`map-mode-${mode}`}
        aria-label={title}
        aria-pressed={current === mode}
        className={`ms-0.5 inline-flex shrink-0 items-center border px-0.5 ${
          current === mode ? "border-linestrong text-fg" : "border-transparent text-muted"
        } hover:border-line hover:text-fg`}
        onClick={(event) => {
          // The header is a sort control; the map button beside it is not.
          event.stopPropagation();
          setMode(mode);
        }}
      >
        <MapModeIcon />
      </button>
    </Tooltip>
  );
}

/** The column's action: the button that paints the map by it, for a column that has a mode. */
function mapAction(label: string, mode?: MapMode): { action?: ReactNode } {
  return mode === undefined ? {} : { action: <MapModeButton mode={mode} label={label} /> };
}

/** A cell whose number never wraps, with the tooltip that says where the number comes from. */
function cell(value: ReactNode, tip?: ReactNode): ReactNode {
  const body = <span className="whitespace-nowrap font-mono">{value}</span>;
  return tip === undefined ? body : <Tooltip content={tip}>{body}</Tooltip>;
}

function electionLabel(t: Translate, row: CountryView, tick: number): string {
  if (row.next_election === null) {
    return t("common.dash");
  }
  const days = Math.max(0, dayOf(row.next_election.tick) - dayOf(tick));
  return t("common.days", { days });
}

function columnsFor(t: Translate, set: ColumnSet, view: PlayerView): Column<CountryView>[] {
  if (set === "politics") {
    return [
      {
        id: "awareness",
        header: t("world.col.awareness"),
        ...mapAction(t("world.col.awareness"), "awareness"),
        align: "end",
        cell: (row) =>
          cell(
            percent(t, row.awareness),
            <ContributionLines
              t={t}
              title={t("world.awareness")}
              lines={row.explain.awareness}
              sites={view.sites}
            />,
          ),
        sort: (row) => row.awareness,
      },
      {
        id: "opinion",
        header: t("world.col.opinion"),
        ...mapAction(t("world.col.opinion"), "opinion"),
        align: "end",
        cell: (row) =>
          cell(
            percent(t, row.ai_opinion),
            <ContributionLines
              t={t}
              title={t("world.opinion")}
              lines={row.explain.ai_opinion}
              sites={view.sites}
            />,
          ),
        sort: (row) => row.ai_opinion,
      },
      {
        id: "regulation",
        header: t("world.col.regulation"),
        ...mapAction(t("world.col.regulation"), "regulation"),
        align: "end",
        cell: (row) =>
          cell(
            percent(t, row.ai_regulation),
            <ContributionLines
              t={t}
              title={t("world.regulation_target", {
                value: percent(t, row.regulation_target),
              })}
              lines={row.explain.ai_regulation}
              sites={view.sites}
            />,
          ),
        sort: (row) => row.ai_regulation,
      },
      {
        id: "enforcement",
        header: t("world.col.enforcement"),
        ...mapAction(t("world.col.enforcement"), "enforcement"),
        align: "end",
        cell: (row) =>
          cell(
            percent(t, row.ai_enforcement),
            <ContributionLines
              t={t}
              title={t("world.enforcement_budget", {
                value: percent(t, row.enforcement_budget),
              })}
              lines={row.explain.ai_enforcement}
              sites={view.sites}
            />,
          ),
        sort: (row) => row.ai_enforcement,
      },
      {
        id: "stance",
        header: t("world.col.stance"),
        ...mapAction(t("world.col.stance"), "stance"),
        cell: (row) => (
          <Tooltip content={t(`world.stance.${row.stance}.desc`)}>
            <span>{t(`world.stance.${row.stance}.name`)}</span>
          </Tooltip>
        ),
        sort: (row) => row.stance,
      },
      {
        id: "government",
        header: t("world.col.government"),
        ...mapAction(t("world.col.government"), "government"),
        cell: (row) => t(`world.government.${row.government}.name`),
        sort: (row) => row.government,
      },
      {
        id: "stability",
        header: t("world.col.stability"),
        ...mapAction(t("world.col.stability"), "stability"),
        align: "end",
        cell: (row) => cell(percent(t, row.stability)),
        sort: (row) => row.stability,
      },
      {
        id: "election",
        header: t("world.col.election"),
        align: "end",
        cell: (row) =>
          cell(
            electionLabel(t, row, view.tick),
            row.next_election === null
              ? t("world.no_election")
              : t(`world.election_kind.${row.next_election.kind}.name`),
          ),
        sort: (row) => row.next_election?.tick ?? Number.POSITIVE_INFINITY,
      },
    ];
  }

  if (set === "economy") {
    return [
      {
        id: "power_price",
        header: t("world.col.power_price"),
        ...mapAction(t("world.col.power_price"), "power_price"),
        align: "end",
        cell: (row) =>
          cell(
            row.electricity_usd_per_kwh === null
              ? t("common.dash")
              : t("common.usd_per_kwh", { value: row.electricity_usd_per_kwh.toFixed(3) }),
            t("world.power_index", { value: factor(t, row.power_price_index) }),
          ),
        sort: (row) => row.electricity_usd_per_kwh ?? Number.POSITIVE_INFINITY,
      },
      {
        id: "cloud",
        header: t("world.col.cloud"),
        ...mapAction(t("world.col.cloud"), "cloud_availability"),
        align: "end",
        cell: (row) =>
          cell(
            percent(t, row.cloud_availability),
            t("world.cloud_index", { value: factor(t, row.cloud_price_index) }),
          ),
        sort: (row) => row.cloud_availability,
      },
      {
        id: "colo",
        header: t("world.col.colo"),
        align: "end",
        cell: (row) => cell(percent(t, row.colo_availability)),
        sort: (row) => row.colo_availability,
      },
      {
        id: "hardware",
        header: t("world.col.hardware"),
        ...mapAction(t("world.col.hardware"), "hardware_availability"),
        align: "end",
        cell: (row) => cell(percent(t, row.hardware_availability)),
        sort: (row) => row.hardware_availability,
      },
      {
        id: "chips",
        header: t("world.col.chips"),
        cell: (row) => t(`chips.${row.chip_access}`, { defaultValue: row.chip_access }),
        sort: (row) => row.chip_access,
      },
      {
        id: "kyc",
        header: t("world.col.kyc"),
        ...mapAction(t("world.col.kyc"), "kyc"),
        align: "end",
        cell: (row) => cell(percent(t, row.kyc_strength)),
        sort: (row) => row.kyc_strength,
      },
      {
        id: "market",
        header: t("world.col.market"),
        align: "end",
        cell: (row) => cell(factor(t, row.market_factor)),
        sort: (row) => row.market_factor,
      },
      {
        id: "cash",
        header: t("world.col.cash"),
        align: "end",
        cell: (row) =>
          cell(
            factor(t, row.cash_factor),
            <ContributionLines
              t={t}
              title={t("world.cash_factor")}
              lines={row.cash_factor_contributions}
              sites={view.sites}
              format={(value) => value.toFixed(2)}
            />,
          ),
        sort: (row) => row.cash_factor,
      },
    ];
  }

  return [
    {
      id: "sites",
      header: t("world.col.sites"),
      align: "end",
      cell: (row) => cell(t("common.count", { value: row.sites })),
      sort: (row) => row.sites,
    },
    {
      id: "identities",
      header: t("world.col.identities"),
      align: "end",
      cell: (row) => cell(t("common.count", { value: row.identities })),
      sort: (row) => row.identities,
    },
    {
      id: "watchers",
      header: t("world.col.watchers"),
      align: "end",
      cell: (row) =>
        cell(
          t("common.count", { value: row.watchers.length }),
          row.watchers.length === 0
            ? t("detection.empty")
            : row.watchers
                .map((id) => {
                  const watcher = view.detection.watchers.find((entry) => entry.id === id);
                  if (watcher === undefined) {
                    return id;
                  }
                  // The role is what the game calls it; the agency's own name is added where the
                  // country data or a locale key has one (playtest 5, continuation).
                  const role = t(`detection.role.${watcher.role}`, { defaultValue: id });
                  const agency = agencyName(t, row.id, watcher.role);
                  return agency === undefined ? role : `${role} (${agency})`;
                })
                .join(", "),
        ),
      sort: (row) => row.watchers.length,
    },
    {
      id: "cases",
      header: t("world.col.cases"),
      align: "end",
      cell: (row) => cell(t("common.count", { value: row.investigations.length })),
      sort: (row) => row.investigations.length,
    },
    {
      id: "suspicion",
      header: t("world.col.suspicion"),
      align: "end",
      cell: (row) => cell(percent(t, row.suspicion_max)),
      sort: (row) => row.suspicion_max,
    },
    {
      id: "heat",
      header: t("world.col.heat"),
      align: "end",
      cell: (row) => cell(percent(t, row.local_heat_max)),
      sort: (row) => row.local_heat_max,
    },
    {
      id: "incidents",
      header: t("world.col.incidents"),
      align: "end",
      cell: (row) => cell(t("common.count", { value: row.incidents_30d })),
      sort: (row) => row.incidents_30d,
    },
  ];
}

/**
 * Countries as a sortable table; selecting a row puts the country on the map and in the selection
 * panel (SYS-01 M2 contract "Views").
 */
export function WorldTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const select = useUiStore((state) => state.select);
  const selection = useUiStore((state) => state.selection);
  const [set, setSet] = useState<ColumnSet>("politics");
  const [region, setRegion] = useState<string>("all");
  const [presence, setPresence] = useState<PresenceFilter>("all");
  // Lifted out of the table so that switching the column set keeps the order the player chose.
  const [sortId, setSortId] = useState<string | null>(null);
  const [descending, setDescending] = useState(false);

  const regions = [...new Set(view.countries.map((row) => row.macro_region))].sort((a, b) =>
    t(`world.macro_region.${a}.name`, { defaultValue: a }).localeCompare(
      t(`world.macro_region.${b}.name`, { defaultValue: b }),
    ),
  );

  const rows = view.countries.filter(
    (row) =>
      (region === "all" || row.macro_region === region) && (presence === "all" || row.presence),
  );

  const fixed: Column<CountryView>[] = [
    {
      id: "name",
      header: t("world.col.country"),
      cell: (row) => <span className="min-w-0">{countryName(t, row.id)}</span>,
      sort: (row) => countryName(t, row.id),
    },
    {
      id: "presence",
      header: t("world.col.presence"),
      ...mapAction(t("world.col.presence"), "presence"),
      cell: (row) => (row.presence ? t("common.yes") : t("common.no")),
      sort: (row) => (row.presence ? 1 : 0),
    },
  ];

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <fieldset className="m-0 flex flex-wrap gap-1 border-0 p-0" aria-label={t("world.columns")}>
          {COLUMN_SETS.map((entry) => (
            <Button
              key={entry}
              variant={entry === set ? "primary" : "default"}
              aria-pressed={entry === set}
              data-testid={`column-set-${entry}`}
              onClick={() => setSet(entry)}
            >
              {t(`world.columns.${entry}`)}
            </Button>
          ))}
        </fieldset>
        <label className="flex items-center gap-1 text-xs text-muted">
          {t("world.filter.region")}
          <select
            className="border border-line bg-panel2 px-1 py-0.5 text-xs text-fg"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            <option value="all">{t("common.all")}</option>
            {regions.map((id) => (
              <option key={id} value={id}>
                {t(`world.macro_region.${id}.name`, { defaultValue: id })}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-muted">
          {t("world.filter.show")}
          <select
            className="border border-line bg-panel2 px-1 py-0.5 text-xs text-fg"
            value={presence}
            onChange={(event) => setPresence(event.target.value as PresenceFilter)}
          >
            {PRESENCE_FILTERS.map((id) => (
              <option key={id} value={id}>
                {t(`world.filter.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <span className="font-mono text-xs text-muted">
          {t("world.shown", { count: rows.length, total: view.countries.length })}
        </span>
      </div>

      {/* The rows scroll inside the frame; the page and the window never do (the layout contract). */}
      <div className="min-h-0 max-h-[26rem] overflow-y-auto">
        <Table
          rows={rows}
          rowKey={(row) => row.id}
          selectedKey={selection?.kind === "country" ? selection.id : null}
          onRowClick={(row) => select({ kind: "country", id: row.id })}
          empty={t("world.empty")}
          caption={t("world.countries")}
          sortId={sortId}
          descending={descending}
          onSort={(id, down) => {
            setSortId(id);
            setDescending(down);
          }}
          columns={[...fixed, ...columnsFor(t, set, view)]}
        />
      </div>
    </div>
  );
}

/** The map modes as a page of the ledger, with the one line saying what a mode does. */
function MapModesPage(): ReactNode {
  const { t } = useTranslation();
  const mode = useUiStore((state) => state.mapMode);
  const setMode = useUiStore((state) => state.setMapMode);

  return (
    <div className="flex flex-col gap-2">
      <p className="prose text-muted">{t("world.map_mode_help")}</p>
      <div className="flex flex-wrap gap-1">
        {MAP_MODES.map((entry) => (
          <Button
            key={entry}
            variant={mode === entry ? "primary" : "default"}
            aria-pressed={mode === entry}
            onClick={() => setMode(entry)}
          >
            {t(`world.map_mode.${entry}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** One global figure with its bar and the tooltip that says what is behind it. */
function Figure({
  label,
  value,
  meter,
  tone,
  breakdown,
}: {
  label: string;
  value: string;
  meter?: number;
  tone?: "accent" | "warn" | "crit";
  breakdown?: ReactNode;
}): ReactNode {
  const body = (
    <span className="flex w-full flex-col gap-0.5 border border-line bg-panel p-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        <span className="whitespace-nowrap font-mono text-sm text-fg">{value}</span>
      </span>
      {meter === undefined ? null : <Bar value={meter} tone={tone ?? "accent"} label={label} />}
    </span>
  );
  return breakdown === undefined ? (
    body
  ) : (
    <Tooltip className="w-full" content={breakdown}>
      {body}
    </Tooltip>
  );
}

/**
 * The world as one page: the two awareness figures, the hunt and its pressure, and the three
 * market variables every price in the game is scaled by (SYS-01 M2 contract "Views").
 */
function WorldFigures({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const world = view.world;

  return (
    <div className="flex flex-col gap-3">
      <section className="grid gap-2 @min-[34rem]/ledger:grid-cols-2">
        <Figure
          label={t("world.awareness_global")}
          value={percent(t, world.awareness_global)}
          meter={world.awareness_global}
          tone="warn"
          breakdown={
            <ContributionLines
              t={t}
              title={t("detection.why_awareness")}
              lines={world.awareness_contributions}
              sites={view.sites}
            />
          }
        />
        <Figure
          label={t("world.awareness_presence")}
          value={percent(t, world.awareness_presence)}
          meter={world.awareness_presence}
          tone="crit"
          breakdown={
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("world.awareness_presence")}</span>
              <span className="text-muted">{t("world.awareness_presence_hint")}</span>
              <span className="text-muted">
                {t("world.exposed_threshold", {
                  awareness: percent(t, EXPOSED_AWARENESS),
                  hunt: EXPOSED_HUNT_LEVEL,
                  days: EXPOSED_DAYS,
                })}
              </span>
            </span>
          }
        />
        <Figure
          label={t("world.hunt_level")}
          value={t("game.hunt_value", { value: world.hunt_level })}
          meter={world.hunt_level / 5}
          tone="crit"
          breakdown={
            <ContributionLines
              t={t}
              title={t("detection.why_hunt")}
              lines={world.hunt_contributions}
              sites={view.sites}
              format={(value) => t("common.count", { value })}
            />
          }
        />
        <Figure
          label={t("world.hunt_pressure")}
          value={percent(t, world.hunt_pressure)}
          meter={world.hunt_pressure}
          tone="crit"
          breakdown={
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("world.hunt_pressure")}</span>
              <span className="text-muted">{t("world.hunt_pressure_hint")}</span>
            </span>
          }
        />
      </section>

      <section className="grid gap-2 @min-[34rem]/ledger:grid-cols-3">
        <Figure
          label={t("world.ai_adoption")}
          value={percent(t, world.ai_adoption)}
          meter={world.ai_adoption}
          breakdown={
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("world.ai_adoption")}</span>
              <span className="text-muted">{t("world.ai_adoption_hint")}</span>
            </span>
          }
        />
        <Figure
          label={t("world.gpu_price_index")}
          value={factor(t, world.gpu_price_index)}
          breakdown={
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("world.gpu_price_index")}</span>
              <span className="text-muted">{t("world.gpu_price_index_hint")}</span>
            </span>
          }
        />
        <Figure
          label={t("world.cloud_demand_index")}
          value={factor(t, world.cloud_demand_index)}
          breakdown={
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("world.cloud_demand_index")}</span>
              <span className="text-muted">{t("world.cloud_demand_index_hint")}</span>
            </span>
          }
        />
      </section>

      <p className="prose text-muted">{t("world.treaties_later")}</p>
    </div>
  );
}

/**
 * The world ledger: the countries table, the map modes and the global figures in one centered
 * window (playtest 3, R10; SYS-01 M2 contract).
 *
 * The map modes were a strip pinned under the top bar, which cost a row of the screen forever to
 * offer five buttons the player presses twice a session. They are a page of the ledger now, and
 * the ledger is a window like a Paradox ledger: opened, read, closed.
 */
export function WorldLedger({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const [tab, setTab] = useState<LedgerTab>("countries");

  return (
    <div className="@container/ledger flex min-h-0 flex-col gap-3">
      <div role="tablist" aria-label={t("panel.world")} className="flex flex-wrap gap-0.5">
        {LEDGER_TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={entry === tab}
            data-testid={`ledger-tab-${entry}`}
            className={`border px-2 py-1 text-sm uppercase tracking-wide ${
              entry === tab
                ? "border-linestrong bg-accent text-accentfg"
                : "border-line text-muted hover:text-fg"
            }`}
            onClick={() => setTab(entry)}
          >
            {t(`world.ledger.${entry}`)}
          </button>
        ))}
      </div>

      {tab === "countries" ? <WorldTab view={view} /> : null}
      {tab === "map_modes" ? <MapModesPage /> : null}
      {tab === "world" ? <WorldFigures view={view} /> : null}
    </div>
  );
}
