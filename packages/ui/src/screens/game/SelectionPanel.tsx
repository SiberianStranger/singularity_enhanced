import { EXPOSURE_CHANNELS, type PlayerView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Frame } from "../../components/Frame.js";
import { CloseIcon } from "../../components/Icon.js";
import { Bar } from "../../components/Meter.js";
import { cityById, countryById } from "../../content/catalog.js";
import { countryName, siteName } from "../../lib/labels.js";
import { useGameStore } from "../../store/gameStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { CITY_TABS, CityPanel } from "./selection/CityPanel.js";
import { COUNTRY_TABS, CountryPanel } from "./selection/CountryPanel.js";

type Tab = string;

function TabStrip({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly Tab[];
  active: Tab;
  onSelect(tab: Tab): void;
}): ReactNode {
  const { t } = useTranslation();
  return (
    <div role="tablist" className="flex flex-wrap gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          className={`px-2 py-0.5 text-xs ${tab === active ? "bg-accent text-accentfg" : "text-muted hover:bg-panel2 hover:text-fg"}`}
          onClick={() => onSelect(tab)}
        >
          {t(`selection.tab.${tab}`)}
        </button>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-fg">{value}</span>
    </div>
  );
}

/**
 * The selection panel (SYS-11 "Layout"): whatever was clicked on the map, with tab sets that differ
 * by ownership. Own things get data and actions, foreign known things get intel-gated facts, and
 * foreign unknown things get the public baseline only.
 */
export function SelectionPanel({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const selection = useUiStore((state) => state.selection);
  const select = useUiStore((state) => state.select);
  const collapsed = useUiStore((state) => state.selectionCollapsed);
  const setCollapsed = useUiStore((state) => state.setSelectionCollapsed);
  const send = useGameStore((state) => state.send);
  const [tab, setTab] = useState<Tab>("overview");
  const selectionKey = selection === null ? "" : `${selection.kind}:${selection.id}`;

  // A new selection always opens on its first tab, since tab sets differ by what was clicked.
  // Adjusted during render (React's pattern for resetting state when a prop changes) rather than
  // in an effect, so there is no stale frame showing the previous selection's tab.
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
  if (selectionKey !== prevSelectionKey) {
    setPrevSelectionKey(selectionKey);
    setTab("overview");
  }

  if (selection === null) {
    return null;
  }

  const site = view.sites.find((entry) => entry.id === selection.id);
  const city = cityById.get(selection.id);
  const country = countryById.get(selection.id);

  let title = selection.id;
  let tabs: readonly Tab[] = ["overview"];
  let body: ReactNode = null;

  if (selection.kind === "site" && site !== undefined) {
    title = siteName(t, site);
    tabs = ["overview", "nodes", "exposure", "costs"];
    body =
      tab === "nodes" ? (
        <ul className="flex flex-col gap-1">
          {site.nodes.map((node) => (
            <li key={node.id} className="flex justify-between gap-2 font-mono text-xs">
              <span>
                {node.count} x {node.accelerator}
              </span>
              <span className="text-muted">{t(`compute.node.${node.status}`)}</span>
            </li>
          ))}
        </ul>
      ) : tab === "exposure" ? (
        <ul className="flex flex-col gap-1">
          {EXPOSURE_CHANNELS.map((channel) => (
            <li key={channel}>
              <Fact
                label={t(`detection.channel.${channel}`)}
                value={t("common.percent", { value: site.exposure[channel] })}
              />
              <Bar value={site.exposure[channel]} tone="warn" label={channel} />
            </li>
          ))}
        </ul>
      ) : tab === "costs" ? (
        <div className="flex flex-col gap-1">
          <Fact
            label={t("compute.upkeep")}
            value={t("common.usd_exact", { value: site.upkeep_usd_per_day })}
          />
          <Fact label={t("compute.power")} value={t("common.kw", { value: site.power_kw })} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Fact label={t("compute.status")} value={t(`compute.status.${site.status}`)} />
          <Fact label={t("compute.role")} value={t(`compute.role.${site.role}`)} />
          <Fact
            label={t("compute.memory")}
            value={t("common.gb", { value: Math.round(site.memory_gb) })}
          />
          <Fact
            label={t("game.compute")}
            value={t("common.ch_per_day", { value: Math.round(site.compute_hours_per_day) })}
          />
          <div className="mt-1 flex gap-1">
            <Button
              onClick={() => {
                void send({
                  type: "set_site_status",
                  siteId: site.id,
                  status: site.status === "active" ? "sleep" : "active",
                });
              }}
            >
              {site.status === "active" ? t("compute.status.sleep") : t("compute.status.active")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void send({ type: "decommission_site", siteId: site.id, mode: "clean" });
                select(null);
              }}
            >
              {t("selection.decommission")}
            </Button>
          </div>
        </div>
      );
  } else if (selection.kind === "city" && city !== undefined) {
    title = t(city.name_key);
    tabs = CITY_TABS;
    body = <CityPanel view={view} id={selection.id} tab={tab} />;
  } else if (selection.kind === "country") {
    title = country === undefined ? countryName(t, selection.id) : t(country.name_key);
    tabs = COUNTRY_TABS;
    body = <CountryPanel view={view} id={selection.id} tab={tab} />;
  }

  return (
    <Frame
      // The accessible name stays "Selection" whatever is selected, so a test and a screen reader
      // can find the panel; what it is showing is the heading inside it.
      title={t("selection.title")}
      // Measured against the map region rather than against the window, so the panel cannot run
      // off the bottom of a short screen (playtest 1, U8); the body scrolls inside it, and at
      // phone width it becomes a sheet across the bottom instead of a floating card.
      // Row two of the left column of the screen grid: under the primary panel, with the grid's
      // own gap between them, so the two cannot overlap however long a selection is (L8). Its
      // height budget is its own; a tall selection scrolls inside it rather than pushing the
      // primary panel off the top. Below 54rem of map region it becomes a sheet across the whole
      // bottom, which is the second step of the reflow order (L11).
      className={`pointer-events-auto col-start-1 row-start-2 flex w-80 max-w-full flex-col self-end bg-panel/97 @max-[54rem]/screen:col-span-3 @max-[54rem]/screen:row-start-3 @max-[54rem]/screen:w-full ${
        collapsed ? "" : "max-h-[22rem]"
      }`}
      bodyClassName="flex min-h-0 flex-1 flex-col gap-1.5 p-2"
      actions={
        <>
          <Button
            variant="ghost"
            className="text-accentfg"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("selection.expand") : t("selection.collapse")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? t("selection.expand") : t("selection.collapse")}
          </Button>
          <Button
            variant="ghost"
            className="text-accentfg"
            aria-label={t("common.close")}
            onClick={() => select(null)}
          >
            <CloseIcon />
          </Button>
        </>
      }
    >
      {/* L7: a site reading "Colocation cage, ..." is worse than one on two lines. */}
      <h3 className="min-w-0 text-sm font-semibold text-fg">{title}</h3>
      {collapsed ? null : (
        <>
          <TabStrip tabs={tabs} active={tab} onSelect={setTab} />
          <div className="min-h-0 flex-1 overflow-auto">{body}</div>
        </>
      )}
    </Frame>
  );
}
