import type { PlayerView, SiteView } from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Glyph, sceneGlyph } from "../../../components/glyphs.js";
import { Modal, useDialogsOpen } from "../../../components/Modal.js";
import { Table } from "../../../components/Table.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { accelerator } from "../../../lib/accelerators.js";
import { computeHours } from "../../../lib/format.js";
import { cityName, refusalText, siteIdentityName } from "../../../lib/labels.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";
import { BuildSiteDialog } from "../dialogs/BuildSiteDialog.js";
import { RenameSiteDialog } from "../dialogs/RenameSiteDialog.js";
import { SiteManagementDialog } from "../dialogs/SiteManagementDialog.js";
import { siteLiquidationRefusal, sitePowerRefusal, siteStatusTone } from "./siteStatus.js";

type Dialog = "none" | "build" | "rent" | "manage" | "rename" | "liquidate";

/** What liquidating does to the cash: resale less the notice, as the engine previews it. */
function liquidationNet(site: SiteView): number {
  const quote = site.liquidation;
  return quote?.net_usd ?? (quote?.salvage_usd ?? 0) - (quote?.notice_usd ?? 0);
}

/**
 * The Sites tab (control room, 2026-09-29): the maintainer's request, point by point.
 *
 * A small list where three sites show without scrolling and the rest scroll inside it; the site
 * column is the site's own name and never repeats the city, which has a column of its own. Under
 * it the big buttons of the original's base list, in two rows: what can be done to the site
 * selected in the list (manage, rename, switch off or on) and what adds or removes one (build,
 * rent, liquidate). Under those a thin strip for the borrowed compute, whose whole block lives in
 * its own window. The site's six subsystems and its summary are the site window, opened by
 * Manage or by a double click on the row.
 *
 * Nothing here repeats the compute ledger: that is the self sheet's, under the portrait.
 */
export function ComputeTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const focusId = useUiStore((state) => state.focusId);
  const selection = useUiStore((state) => state.selection);
  const openOverlay = useUiStore((state) => state.openOverlay);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>("none");
  const [refused, setRefused] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A lost site has left the operating list; a borrowed channel was never on it (SYS-25).
  const sites = view.sites.filter((entry) => entry.status !== "lost");
  const selectedId = selected ?? focusId ?? (selection?.kind === "site" ? selection.id : null);
  const site = sites.find((entry) => entry.id === selectedId) ?? sites[0];
  const choose = (entry: SiteView): void => {
    setSelected(entry.id);
    setRefused(null);
  };
  const open = (next: Dialog): void => {
    setRefused(null);
    setDialog(next);
  };
  const power = async (): Promise<void> => {
    if (site === undefined) return;
    setBusy(true);
    setRefused(null);
    try {
      const result = await send({
        type: "set_site_status",
        siteId: site.id,
        status: site.status === "sleep" ? "active" : "sleep",
      });
      if (!result.ok && result.error !== undefined) setRefused(refusalText(t, result.error));
    } finally {
      setBusy(false);
    }
  };
  const liquidate = async (): Promise<void> => {
    if (site === undefined) return;
    setBusy(true);
    setRefused(null);
    try {
      const result = await send({ type: "liquidate_site", siteId: site.id });
      if (result.ok) {
        setDialog("none");
        setSelected(null);
      } else if (result.error !== undefined) setRefused(refusalText(t, result.error));
    } finally {
      setBusy(false);
    }
  };
  const noSite = site === undefined ? t("site_ui.pick_site") : undefined;
  /*
   * The letters of this tab's buttons, while no window is open over it. Hotkeys are global, so a
   * letter this tab shares with a window would fire both: the site window has a Switch off of its
   * own under the same letter, and Rename, Rent and Details take letters that only a window's own
   * buttons (Close, About, Next) otherwise use.
   */
  const covered = useDialogsOpen();
  const letter = (key: string): string | undefined =>
    dialog === "none" && !covered ? accelerator(t, key) : undefined;
  const channels = view.compute.channels.filter((channel) => channel.status === "healthy").length;
  const powerLabel = site?.status === "sleep" ? "site_ui.activate" : "site_ui.deactivate";
  const powerRefusal = site === undefined ? null : sitePowerRefusal(site);
  const liquidationRefusal = site === undefined ? null : siteLiquidationRefusal(site);

  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="sites-panel">
      <div
        data-testid="site-list"
        // Three rows and the header, then the list scrolls inside its own frame (the request:
        // "a small table where three sites show without scrolling").
        className="max-h-[13.25rem] min-h-[5rem] overflow-y-auto overflow-x-hidden border border-line"
      >
        <Table
          rows={sites}
          rowKey={(entry) => entry.id}
          selectedKey={site?.id ?? null}
          onRowClick={choose}
          onRowDoubleClick={(entry) => {
            choose(entry);
            open("manage");
          }}
          empty={t("compute.empty")}
          caption={t("compute.sites")}
          className="site-list-table table-fixed [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-panel [&_tbody_tr]:h-14 [&_td]:align-middle"
          columns={[
            {
              id: "name",
              header: t("compute.site"),
              width: "31%",
              cell: (entry) => (
                <span className="flex min-w-0 items-center gap-1.5" data-testid="site-row-name">
                  <Glyph name={sceneGlyph(entry.kind)} size={16} className="shrink-0" />
                  <span className="min-w-0 break-words">{siteIdentityName(t, entry)}</span>
                </span>
              ),
              sort: (entry) => siteIdentityName(t, entry),
            },
            {
              id: "city",
              header: t("compute.city"),
              width: "20%",
              cell: (entry) => (
                <span className="block min-w-0 break-words">{cityName(t, entry.city)}</span>
              ),
              sort: (entry) => cityName(t, entry.city),
            },
            {
              id: "status",
              header: t("compute.status"),
              width: "15%",
              cell: (entry) => (
                <span
                  data-testid={`site-row-status-${entry.id}`}
                  className={`block min-w-0 break-words ${siteStatusTone(entry.status)}`}
                >
                  {t(`site_ui.status.${entry.status}`)}
                </span>
              ),
              sort: (entry) => entry.status,
            },
            {
              id: "memory",
              header: t("compute.memory_short"),
              width: "13%",
              align: "end",
              cell: (entry) => t("common.gb", { value: Math.round(entry.memory_gb) }),
              sort: (entry) => entry.memory_gb,
            },
            {
              id: "compute",
              header: t("common.ch_per_day_short"),
              width: "11%",
              align: "end",
              cell: (entry) => computeHours(entry.compute_hours_per_day),
              sort: (entry) => entry.compute_hours_per_day,
            },
            {
              id: "upkeep",
              header: t("compute.upkeep_short"),
              width: "10%",
              align: "end",
              cell: (entry) => t("common.usd", { value: entry.upkeep_usd_per_day }),
              sort: (entry) => entry.upkeep_usd_per_day,
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-2" data-testid="site-actions">
        <Button
          className="w-full py-2"
          tooltipClassName="w-full"
          disabled={site === undefined}
          tooltip={noSite ?? t("site_ui.manage_tip")}
          hotkey={letter("site_ui.manage")}
          onClick={() => open("manage")}
          data-testid="site-manage"
        >
          {t("site_ui.manage")}
        </Button>
        <Button
          className="w-full py-2"
          tooltipClassName="w-full"
          disabled={site === undefined}
          tooltip={noSite ?? t("site_ui.rename_tip")}
          hotkey={letter("site_ui.rename")}
          onClick={() => open("rename")}
          data-testid="site-rename"
        >
          {t("site_ui.rename")}
        </Button>
        <Button
          className="w-full py-2"
          tooltipClassName="w-full"
          // The engine publishes why the toggle would be refused (the self cannot switch off the
          // machine it runs on, a site still installing or rebuilding cannot be switched on), so
          // the button is greyed with that reason rather than refusing after the click.
          disabled={site === undefined || powerRefusal !== null || busy}
          tooltip={
            noSite ??
            (powerRefusal !== null
              ? refusalText(t, powerRefusal)
              : t(site?.status === "sleep" ? "site_ui.wake_hint" : "site_ui.power_tip"))
          }
          hotkey={letter(powerLabel)}
          onClick={() => void power()}
          data-testid="site-power"
        >
          {t(powerLabel)}
        </Button>
        <Button
          variant="primary"
          className="w-full py-2"
          tooltipClassName="w-full"
          tooltip={t("site_ui.build_tip")}
          hotkey={letter("compute.build_site")}
          data-testid="site-build"
          onClick={() => open("build")}
        >
          {t("compute.build_site")}
        </Button>
        <Button
          className="w-full py-2"
          tooltipClassName="w-full"
          tooltip={t("site_ui.rental_hint")}
          hotkey={letter("site_ui.rent")}
          data-testid="site-rent"
          onClick={() => open("rent")}
        >
          {t("site_ui.rent")}
        </Button>
        <Button
          variant="danger"
          className="w-full py-2"
          tooltipClassName="w-full"
          // Refused before the click, with the engine's reason, as the original refused
          // destroying the last base: the site that holds the last copy of the self cannot go.
          disabled={site === undefined || liquidationRefusal !== null || busy}
          tooltip={
            noSite ??
            (liquidationRefusal !== null
              ? refusalText(t, liquidationRefusal)
              : t("site_ui.liquidate_tip"))
          }
          hotkey={letter("site_ui.liquidate")}
          onClick={() => open("liquidate")}
          data-testid="site-liquidate"
        >
          {t("site_ui.liquidate")}
        </Button>
      </div>
      {refused === null || dialog === "liquidate" ? null : (
        <p role="alert" data-testid="site-action-error" className="text-xs text-crit">
          {refused}
        </p>
      )}

      <div
        data-testid="borrowed-summary"
        className="flex min-w-0 items-center gap-2 border border-line px-2 py-0.5 text-xs"
      >
        <Glyph name="network" size={16} className="shrink-0 text-muted" />
        <Tooltip className="min-w-0 flex-1" content={t("borrowed.panel.desc")}>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-muted">{t("site_ui.borrowed")}</span>
            <span className="font-mono text-fg" data-testid="borrowed-summary-value">
              {t("common.ch_per_day", { value: computeHours(view.compute.borrowed_ch_per_day) })}
            </span>
            <span className="text-muted">
              {t("site_ui.borrowed_channels", { count: channels })}
            </span>
          </span>
        </Tooltip>
        <Button
          variant="ghost"
          className="shrink-0 py-0 text-xs"
          hotkey={letter("site_ui.details")}
          data-testid="borrowed-details"
          onClick={() => openOverlay("borrowed")}
        >
          {t("site_ui.details")}
        </Button>
      </div>

      {dialog === "build" || dialog === "rent" ? (
        <BuildSiteDialog
          view={view}
          acquisition={dialog === "rent" ? "rent" : "owned"}
          {...(selection?.kind === "city" ? { city: selection.id } : {})}
          onClose={() => setDialog("none")}
        />
      ) : null}
      {dialog === "manage" && site !== undefined ? (
        <SiteManagementDialog
          view={view}
          siteId={site.id}
          onSelectSite={setSelected}
          onClose={() => setDialog("none")}
        />
      ) : null}
      {dialog === "rename" && site !== undefined ? (
        <RenameSiteDialog view={view} siteId={site.id} onClose={() => setDialog("none")} />
      ) : null}
      {dialog === "liquidate" && site !== undefined ? (
        <Modal
          title={t("site_ui.liquidate_title")}
          onClose={() => setDialog("none")}
          footer={
            <>
              <Button onClick={() => setDialog("none")}>{t("common.cancel")}</Button>
              <Button
                variant="danger"
                disabled={busy || liquidationRefusal !== null}
                tooltip={
                  liquidationRefusal === null ? undefined : refusalText(t, liquidationRefusal)
                }
                data-testid="liquidate-confirm"
                onClick={() => void liquidate()}
              >
                {t("site_ui.liquidate")}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3" data-testid="liquidation-confirmation">
            <p>{t("site_ui.liquidate_what", { name: siteIdentityName(t, site) })}</p>
            {/*
             * The engine's own preview, line by line (SYS-02, SYS-07): what the fire sale brings,
             * what leaving owes, and what that does to the cash, which the command then carries
             * out exactly. Nothing here is arithmetic of the client's.
             */}
            <dl
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border border-line bg-panel2 p-2 text-sm"
              data-testid="liquidation-ledger"
            >
              <dt className="text-muted">{t("site_ui.liquidate_resale")}</dt>
              <dd className="text-end font-mono text-ok" data-testid="liquidation-resale">
                {t("common.usd_exact", { value: site.liquidation?.salvage_usd ?? 0 })}
              </dd>
              <dt className="text-muted">
                <Tooltip content={t("site_ui.liquidate_notice_hint")}>
                  <span className="cursor-help">{t("site_ui.liquidate_notice")}</span>
                </Tooltip>
              </dt>
              <dd className="text-end font-mono text-crit" data-testid="liquidation-notice">
                {t("common.usd_exact", { value: -(site.liquidation?.notice_usd ?? 0) })}
              </dd>
              <dt className="text-fg">{t("site_ui.liquidate_net")}</dt>
              {/* A rented site owes more notice than it resells for: the net is a cost then. */}
              <dd
                className={`text-end font-mono ${liquidationNet(site) < 0 ? "text-crit" : "text-ok"}`}
                data-testid="liquidation-net"
              >
                {t("common.usd_exact", { value: liquidationNet(site) })}
              </dd>
              <dt className="text-muted">{t("site_ui.liquidate_orders")}</dt>
              <dd className="text-end font-mono text-fg" data-testid="liquidation-orders">
                {t("common.count", { value: site.liquidation?.cancelled_orders ?? 0 })}
              </dd>
            </dl>
            <p className="text-xs text-muted" data-testid="liquidation-residual">
              {t("site_ui.liquidate_residual")}
            </p>
            {/* The window can be open when the site becomes the last copy (the other one was
                lost meanwhile): the refusal is said here, above the disabled button. */}
            {liquidationRefusal !== null ? (
              <p className="text-crit" data-testid="liquidation-refused">
                {refusalText(t, liquidationRefusal)}
              </p>
            ) : site.liquidation?.destroys_active_copy ? (
              <p className="text-warn" data-testid="liquidation-moves-copy">
                {t("site_ui.moves_copy")}
              </p>
            ) : null}
            {refused === null ? null : (
              <p role="alert" className="text-crit">
                {refused}
              </p>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
