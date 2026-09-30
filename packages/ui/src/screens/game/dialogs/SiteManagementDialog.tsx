import {
  type CommandError,
  type EquipmentSlot,
  EXPOSURE_CHANNELS,
  type PlayerView,
  PRECISIONS,
  type SiteView,
} from "@singularity/core";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Bar } from "../../../components/Meter.js";
import { Modal } from "../../../components/Modal.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { accelerator } from "../../../lib/accelerators.js";
import { computeHours } from "../../../lib/format.js";
import { typingInTextField } from "../../../lib/hotkeys.js";
import {
  cityName,
  countryName,
  refusalText,
  siteIdentityName,
  siteKindName,
} from "../../../lib/labels.js";
import { type UiCommand, useGameStore } from "../../../store/gameStore.js";
import { SiteEquipmentPanel } from "../tabs/SiteEquipmentPanel.js";
import { ContextDial, PrecisionTable } from "../tabs/SiteSelfControls.js";
import { sitePowerRefusal, siteStatusTone } from "../tabs/siteStatus.js";
import { EquipmentDialog } from "./EquipmentDialog.js";
import { RenameSiteDialog } from "./RenameSiteDialog.js";

interface SiteManagementDialogProps {
  view: PlayerView;
  siteId: string;
  onClose(): void;
  onSelectSite?(id: string): void;
}

/** The arrow of the previous or next site; a drawn chevron rather than a character. */
function Chevron({ direction }: { direction: -1 | 1 }): ReactNode {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none">
      <path
        d={direction < 0 ? "m12 4-6 6 6 6" : "m8 4 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * The site window (control room, 2026-09-29), arranged as the maintainer asked and as the
 * original's base window was: the site's name with its kind in brackets across the top between
 * the arrows to the previous and the next site, its state under the name in green while it works,
 * the six subsystems on the left one per row with the button that changes each, and the summary on
 * the right. The left and right arrow keys page through the sites as the original's did.
 *
 * Changing a subsystem and renaming the site replace this window for as long as they take and come
 * back to it: two dialogs stacked on each other would both take Escape.
 */
export function SiteManagementDialog({
  view,
  siteId,
  onClose,
  onSelectSite,
}: SiteManagementDialogProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const [selectedId, setSelectedId] = useState(siteId);
  const [configuration, setConfiguration] = useState<EquipmentSlot | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [pending, setPending] = useState(false);
  const [refused, setRefused] = useState<CommandError | null>(null);
  const sites = view.sites.filter((entry) => entry.status !== "lost");
  const site = sites.find((entry) => entry.id === selectedId) ?? sites[0];

  useEffect(() => {
    setSelectedId(siteId);
    setConfiguration(null);
  }, [siteId]);

  const select = useCallback(
    (direction: -1 | 1): void => {
      if (site === undefined || sites.length < 2 || pending) return;
      const position = sites.findIndex((entry) => entry.id === site.id);
      const next = sites[(position + direction + sites.length) % sites.length];
      if (next === undefined) return;
      setSelectedId(next.id);
      setRefused(null);
      onSelectSite?.(next.id);
    },
    [site, sites, pending, onSelectSite],
  );

  // The original's keys for the two arrows; a field or a list keeps its own arrows.
  const paging = configuration === null && !renaming;
  useEffect(() => {
    if (!paging) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey || typingInTextField(event.target)) {
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        select(event.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paging, select]);

  const run = async (command: UiCommand): Promise<boolean> => {
    if (pending) return false;
    setPending(true);
    setRefused(null);
    try {
      const result = await send(command);
      if (!result.ok) {
        setRefused(result.error ?? { key: "error.command" });
        return false;
      }
      return true;
    } catch {
      setRefused({ key: "error.command" });
      return false;
    } finally {
      setPending(false);
    }
  };

  if (configuration !== null && site !== undefined) {
    return (
      <EquipmentDialog
        key={`${site.id}/${configuration}`}
        view={view}
        siteId={site.id}
        initialSlot={configuration}
        onClose={() => setConfiguration(null)}
      />
    );
  }

  if (renaming && site !== undefined) {
    return <RenameSiteDialog view={view} siteId={site.id} onClose={() => setRenaming(false)} />;
  }

  if (site === undefined) {
    return (
      <Modal
        title={t("site_ui.title")}
        size="ledger"
        onClose={onClose}
        footer={<Button onClick={onClose}>{t("common.close")}</Button>}
      >
        <p data-testid="site-management" className="min-w-0 break-words text-muted">
          {t("compute.empty")}
        </p>
      </Modal>
    );
  }

  const identity = siteIdentityName(t, site);
  const kind = siteKindName(t, site.kind);
  // "Name (kind)", as the original titled a base; a site still called by its kind says it once.
  const title = identity.toLowerCase() === kind.toLowerCase() ? identity : `${identity} (${kind})`;
  const isActiveMind = site.id === view.self.active_site_id;
  const capacity = site.equipment?.power_capacity_kw ?? site.power_cap_kw;
  const capacityText =
    capacity === null
      ? t("equipment_ui.capacity_unspecified")
      : t("common.kw", { value: Math.round(capacity * 100) / 100 });
  const powerText = t("common.kw", { value: Math.round(site.power_kw * 100) / 100 });
  const powerLabel = site.status === "sleep" ? "site_ui.activate" : "site_ui.deactivate";
  const powerRefusal = sitePowerRefusal(site);
  const facts: { id: string; label: string; value: ReactNode; hint?: ReactNode }[] = [
    {
      id: "city",
      label: t("compute.city"),
      value: (
        <span>
          {cityName(t, site.city)}
          <span className="block text-muted">{countryName(t, site.country)}</span>
        </span>
      ),
    },
    {
      id: "compute",
      label: t("site_ui.compute"),
      value: t("common.ch_per_day", { value: computeHours(site.compute_hours_per_day) }),
      hint: t("site_ui.compute_hint"),
    },
    {
      id: "memory",
      label: t("compute.memory"),
      value: t("common.gb", { value: Math.round(site.memory_gb) }),
      hint: t("site_ui.memory_hint"),
    },
    {
      id: "power",
      label: t("compute.power"),
      value: t("site_ui.power_value", { used: powerText, capacity: capacityText }),
      hint: t("site_ui.power_hint", { used: powerText, capacity: capacityText }),
    },
    {
      id: "upkeep",
      label: t("compute.upkeep"),
      value: t("equipment_ui.daily", { value: site.upkeep_usd_per_day }),
      hint: (
        <span>
          {t(site.bill_reason_key)}
          <span className="mt-1 block">{t("site_ui.upkeep_hint")}</span>
        </span>
      ),
    },
  ];

  return (
    <Modal
      size="ledger"
      title={
        <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Button
            aria-label={t("site_ui.previous")}
            tooltip={t("site_ui.previous")}
            disabled={pending || sites.length < 2}
            onClick={() => select(-1)}
            data-testid="site-previous"
          >
            <Chevron direction={-1} />
          </Button>
          <span
            className="min-w-0 break-words text-center normal-case tracking-normal"
            aria-live="polite"
            data-testid="site-management-title"
          >
            {title}
          </span>
          <Button
            aria-label={t("site_ui.next")}
            tooltip={t("site_ui.next")}
            disabled={pending || sites.length < 2}
            onClick={() => select(1)}
            data-testid="site-next"
          >
            <Chevron direction={1} />
          </Button>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button
            tooltip={t("site_ui.rename_tip")}
            disabled={pending}
            hotkey={accelerator(t, "site_ui.rename")}
            data-testid="site-window-rename"
            onClick={() => {
              setRefused(null);
              setRenaming(true);
            }}
          >
            {t("site_ui.rename")}
          </Button>
          <Button
            disabled={pending || powerRefusal !== null}
            tooltip={
              powerRefusal !== null
                ? refusalText(t, powerRefusal)
                : t(site.status === "sleep" ? "site_ui.wake_hint" : "site_ui.sleep_hint")
            }
            hotkey={accelerator(t, powerLabel)}
            data-testid="site-toggle-sleep"
            onClick={() =>
              void run({
                type: "set_site_status",
                siteId: site.id,
                status: site.status === "sleep" ? "active" : "sleep",
              })
            }
          >
            {t(powerLabel)}
          </Button>
          <Button variant="primary" hotkey={accelerator(t, "common.close")} onClick={onClose}>
            {t("common.close")}
          </Button>
        </>
      }
    >
      <section
        data-testid="site-management"
        data-site-id={site.id}
        className="flex min-w-0 flex-col gap-3"
      >
        <p
          className="mx-auto flex min-w-0 max-w-none flex-wrap items-baseline justify-center gap-x-2 text-center"
          data-testid="site-management-state"
        >
          <span
            className={`font-display text-sm uppercase ${siteStatusTone(site.status)}`}
            data-testid="site-management-status"
            data-status={site.status}
          >
            {t(`site_ui.status.${site.status}`)}
          </span>
          {isActiveMind ? (
            <span className="text-xs text-muted">{t("compute.role.active_mind")}</span>
          ) : null}
        </p>

        {refused === null ? null : (
          <p
            role="alert"
            data-testid="site-management-error"
            className="min-w-0 break-words text-xs text-crit"
          >
            {refusalText(t, refused)}
          </p>
        )}

        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(15rem,1fr)]">
          <div className="min-w-0">
            <SiteEquipmentPanel
              view={view}
              site={site}
              onConfigure={(slot) => {
                setRefused(null);
                setConfiguration(slot);
              }}
            />
          </div>
          <aside
            className="flex min-w-0 flex-col gap-3 border border-line bg-panel2 p-3"
            aria-label={t("site_ui.summary")}
            data-testid="site-summary"
          >
            <h3 className="text-xs uppercase tracking-wide text-muted">{t("site_ui.summary")}</h3>
            <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-3 gap-y-1.5 text-xs">
              {facts.map((fact) => (
                <div key={fact.id} className="contents" data-testid={`site-fact-${fact.id}`}>
                  <dt className="min-w-0 break-words text-muted">
                    {fact.hint === undefined ? (
                      fact.label
                    ) : (
                      <Tooltip content={fact.hint}>
                        <span className="cursor-help">{fact.label}</span>
                      </Tooltip>
                    )}
                  </dt>
                  <dd className="min-w-0 break-words text-end tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="grid min-w-0 grid-cols-2 gap-2 border-t border-line pt-3">
              <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
                {t("compute.role")}
                <select
                  aria-label={t("compute.role")}
                  value={site.role}
                  disabled={pending}
                  className="w-full min-w-0 border border-line bg-panel px-2 py-1 text-sm text-fg"
                  onChange={(event) =>
                    void run({
                      type: "set_site_role",
                      siteId: site.id,
                      role: event.target.value as SiteView["role"],
                    })
                  }
                >
                  {(["active_mind", "standby", "worker", "none"] as const).map((role) => (
                    <option key={role} value={role}>
                      {t(`compute.role.${role}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
                {t("compute.precision")}
                <select
                  aria-label={t("compute.precision")}
                  value={site.precision ?? ""}
                  disabled={pending || site.best_precision === null}
                  className="w-full min-w-0 border border-line bg-panel px-2 py-1 text-sm text-fg"
                  onChange={(event) =>
                    void run({
                      type: "set_precision",
                      siteId: site.id,
                      precision: event.target.value as (typeof PRECISIONS)[number],
                    })
                  }
                >
                  {site.precision === null ? (
                    <option value="" disabled>
                      {t("common.dash")}
                    </option>
                  ) : null}
                  {PRECISIONS.map((precision) => (
                    <option key={precision} value={precision}>
                      {t(`precision.${precision}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section
              className="min-w-0 border-t border-line pt-3"
              aria-label={t("compute.exposure")}
            >
              <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">
                {t("compute.exposure")}
              </h4>
              <ul className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
                {EXPOSURE_CHANNELS.map((channel) => {
                  const current = site.exposure[channel];
                  const stored = site.stored_exposure?.[channel] ?? current;
                  const label = t(`detection.channel.${channel}`);
                  const currentText = t("common.percent", { value: current });
                  return (
                    <li key={channel} className="min-w-0" data-testid={`site-signature-${channel}`}>
                      <Tooltip
                        className="w-full"
                        content={t("site_ui.signature_hint", {
                          current: currentText,
                          stored: t("common.percent", { value: stored }),
                          factor: t("common.percent", { value: site.signature_factor ?? 1 }),
                        })}
                      >
                        <button
                          type="button"
                          className="flex w-full min-w-0 cursor-help flex-col gap-1 text-start text-xs"
                          aria-label={`${label}: ${currentText}`}
                        >
                          <span className="flex w-full min-w-0 justify-between gap-2">
                            <span className="min-w-0 break-words text-muted">{label}</span>
                            <span className="shrink-0 font-mono tabular-nums">{currentText}</span>
                          </span>
                          <Bar
                            value={current}
                            tone={current > 0.6 ? "crit" : current > 0.25 ? "warn" : "ok"}
                            label={label}
                          />
                        </button>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>

        {isActiveMind ? (
          <details className="min-w-0 border border-line p-3" data-testid="site-advanced-self">
            <summary className="cursor-pointer break-words text-xs uppercase tracking-wide text-muted">
              {t("site_ui.advanced")}
            </summary>
            <div className="mt-3 flex min-w-0 flex-col gap-3">
              <PrecisionTable view={view} site={site} />
              <ContextDial view={view} site={site} />
            </div>
          </details>
        ) : null}
      </section>
    </Modal>
  );
}
