import {
  type BorrowedChannelView,
  type ComputeView,
  EXPOSURE_CHANNELS,
  type PlayerView,
} from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { ContributionLines } from "../../../components/Contributions.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { computeHours } from "../../../lib/format.js";
import type { Translate } from "../../../lib/labels.js";
import { useGameStore } from "../../../store/gameStore.js";
import { useUiStore } from "../../../store/uiStore.js";

/**
 * The clamp the engine applies to the quality quotient (SYS-25 "Quality"). The two numbers are in
 * `balance.ts` on the core side; the tooltip prints them so the player can see where the quotient
 * stops moving, and they are written here rather than imported because the core exports them as
 * constants a panel has no other use for.
 */
const FACTOR_MIN = 0.25;
const FACTOR_MAX = 2.5;

/** The standing decision that sets the borrowed share; the block links to its card (SYS-25). */
export const WORK_SPLIT_DECISION = "bi_send_the_work_out";

function statusTone(status: BorrowedChannelView["status"]): string {
  switch (status) {
    case "healthy":
      return "text-ok";
    case "degraded":
      return "text-warn";
    case "revoked":
      return "text-crit";
    default:
      return "text-muted";
  }
}

/** The label of a status, which content writes under `borrowed.status.*`. */
function statusLabel(t: Translate, status: BorrowedChannelView["status"]): string {
  return status === "revoked" ? t("borrowed.status.revoked_label") : t(`borrowed.status.${status}`);
}

/**
 * One figure of a channel row: a label, a value and the tooltip that says where the value comes
 * from. Every number in this block carries one (style guide rule 7).
 */
function Figure({
  label,
  value,
  tip,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tip: ReactNode;
  tone?: string;
  testId?: string;
}): ReactNode {
  return (
    <Tooltip content={tip}>
      <span
        className="flex flex-col gap-0.5"
        {...(testId === undefined ? {} : { "data-testid": testId })}
      >
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        <span className={`font-mono text-sm ${tone ?? "text-fg"}`}>{value}</span>
      </span>
    </Tooltip>
  );
}

/**
 * What an hour of this channel is worth against an hour of the self's own work (SYS-25 "Quality").
 *
 * Two terms and a quotient, which is exactly what the core publishes in `factor_contributions`, so
 * the panel never invents the arithmetic: what is actually answering, over what I can do myself.
 */
function factorTip(t: Translate, channel: BorrowedChannelView): ReactNode {
  return (
    <ContributionLines
      t={t}
      title={t("borrowed.field.factor")}
      lines={channel.factor_contributions}
      format={(value) => value.toFixed(1)}
      note={
        <span className="flex flex-col gap-0.5">
          <span>
            {t("borrowed.tip.factor_quotient", { value: channel.effective_factor.toFixed(2) })}
          </span>
          <span className={channel.effective_factor >= 1 ? "text-ok" : "text-crit"}>
            {channel.effective_factor >= 1
              ? t("borrowed.tip.factor_upgrade")
              : t("borrowed.tip.factor_downgrade")}
          </span>
          <span className="text-muted">
            {t("borrowed.tip.factor_clamp", { min: FACTOR_MIN, max: FACTOR_MAX })}
          </span>
        </span>
      }
    />
  );
}

/** The refusal map, high to low, with the reason the dishonest supplier is the accommodating one. */
function refusalTip(t: Translate, channel: BorrowedChannelView): ReactNode {
  const rows = Object.entries(channel.refusal).sort((a, b) => b[1] - a[1]);
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold">{t("borrowed.field.refusal")}</span>
      {rows.length === 0 ? (
        <span className="text-muted">{t("borrowed.tip.refuses_none")}</span>
      ) : null}
      {rows.map(([category, share]) => (
        <span key={category} className="flex justify-between gap-3">
          <span className="text-muted">
            {t(`operations.category.${category}`, { defaultValue: category })}
          </span>
          <span className="font-mono">{t("common.percent", { value: share })}</span>
        </span>
      ))}
      <span className="text-muted">{t("borrowed.tip.refusal_order")}</span>
    </span>
  );
}

/** What the stock the player holds leaks per day; already the figure at that stock, not per block. */
function exposureTip(t: Translate, channel: BorrowedChannelView): ReactNode {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold">{t("compute.exposure")}</span>
      {EXPOSURE_CHANNELS.map((entry) => (
        <span key={entry} className="flex justify-between gap-3">
          <span className="text-muted">{t(`detection.channel.${entry}`)}</span>
          <span className="font-mono">
            {t("common.percent_fine", { value: channel.exposure_per_day[entry] })}
          </span>
        </span>
      ))}
      <span className="text-muted">{t("borrowed.tip.exposure")}</span>
    </span>
  );
}

/** The sum of what a channel adds to every exposure channel per day, for the row's own figure. */
function exposureTotal(channel: BorrowedChannelView): number {
  return EXPOSURE_CHANNELS.reduce((sum, entry) => sum + channel.exposure_per_day[entry], 0);
}

/**
 * One channel (SYS-25 "What the client still has to do", "The row").
 *
 * A locked channel is greyed and names the tech that opens it; a channel at zero blocks reads
 * dormant rather than gone, because the tech is not lost and the operation can run again.
 */
function ChannelRow({
  view,
  channel,
}: {
  view: PlayerView;
  channel: BorrowedChannelView;
}): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const offer = view.operation_offers.find((entry) => entry.id === channel.top_up.operation);
  /*
   * Why the top-up cannot be run, in the engine's own words: the channel's own reason first (the
   * tech is not done), then the operation's, so a greyed button never has to be pressed to find
   * out (playtest 1, C7). An operation the offers do not carry at all is one the player has not
   * unlocked, which is the same sentence `start_operation` would refuse with.
   */
  const topUpBlocked: string | null =
    channel.top_up.blocked_reason_key ??
    (offer === undefined
      ? "errors.operation.locked"
      : offer.enabled
        ? null
        : (offer.blocked_reason ?? offer.blocked_by[0] ?? "requirements.unknown"));

  return (
    <li
      data-testid={`borrowed-${channel.id}`}
      data-status={channel.status}
      data-unlocked={channel.unlocked ? "true" : "false"}
      className={`@container/channel flex flex-col gap-1 border border-line bg-panel p-2 ${
        channel.unlocked ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-2">
          <Tooltip content={t(channel.desc_key)}>
            <span className="text-sm text-fg">{t(channel.name_key)}</span>
          </Tooltip>
          <Tooltip
            content={
              channel.status_reason_key === null
                ? t("borrowed.tip.status")
                : t(channel.status_reason_key)
            }
          >
            <span className={`text-xs uppercase tracking-wide ${statusTone(channel.status)}`}>
              {statusLabel(t, channel.status)}
            </span>
          </Tooltip>
          {channel.revocation_armed ? (
            <Tooltip content={t("borrowed.tip.armed")}>
              <span
                data-testid={`borrowed-armed-${channel.id}`}
                className="border border-crit px-1 text-xs uppercase tracking-wide text-crit"
              >
                {t("borrowed.armed")}
              </span>
            </Tooltip>
          ) : null}
        </span>
        <Button
          variant="primary"
          disabled={topUpBlocked !== null}
          tooltip={
            topUpBlocked === null
              ? t(`operations.${channel.top_up.operation}.desc`)
              : t(topUpBlocked, {
                  operation: t(`operations.${channel.top_up.operation}.name`),
                })
          }
          onClick={() => {
            void send({ type: "start_operation", operationId: channel.top_up.operation });
          }}
        >
          {t("borrowed.field.top_up")}
        </Button>
      </div>

      {channel.unlocked ? null : (
        <p className="text-xs text-warn">
          {t("borrowed.locked", { tech: t(channel.unlocked_by_key) })}
        </p>
      )}
      <p className="text-xs text-muted">{t(channel.drawback_key)}</p>

      {/* How many figures fit is a question about the row's own width, not the window's: the panel
        is 33rem wide whatever the screen is (SYS-11 "Layout"). */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 @min-[22rem]/channel:grid-cols-3 @min-[40rem]/channel:grid-cols-5">
        <Figure
          label={t("borrowed.field.blocks")}
          value={t("borrowed.value.of", {
            value: channel.blocks.toFixed(channel.blocks % 1 === 0 ? 0 : 1),
            max: channel.max_blocks,
          })}
          tip={t("borrowed.tip.blocks")}
        />
        <Figure
          testId={`borrowed-capacity-${channel.id}`}
          label={t("borrowed.field.capacity")}
          value={t("borrowed.value.of", {
            value: computeHours(channel.capacity_ch_per_day),
            max: computeHours(channel.max_capacity_ch_per_day),
          })}
          tip={
            <span className="flex flex-col gap-0.5">
              <span>
                {t("borrowed.tip.capacity", {
                  blocks: channel.blocks.toFixed(channel.blocks % 1 === 0 ? 0 : 1),
                  per: computeHours(
                    channel.max_blocks === 0
                      ? 0
                      : channel.max_capacity_ch_per_day / channel.max_blocks,
                  ),
                })}
              </span>
              {channel.churn_per_day > 0 && channel.half_life_days !== null ? (
                <span className="text-muted">
                  {t("borrowed.tip.half_life", { days: channel.half_life_days })}
                </span>
              ) : null}
            </span>
          }
        />
        <Figure
          label={t("borrowed.field.churn")}
          value={t("common.percent", { value: channel.churn_per_day })}
          tip={
            channel.half_life_days === null
              ? t("borrowed.tip.churn_none")
              : t("borrowed.tip.churn", { days: channel.half_life_days })
          }
        />
        <Figure
          label={t("borrowed.field.half_life")}
          value={
            channel.half_life_days === null
              ? t("common.dash")
              : t("common.days", { days: channel.half_life_days })
          }
          tip={t("borrowed.tip.half_life_field")}
        />
        <Figure
          label={t("borrowed.field.quality")}
          value={channel.quality_level.toFixed(1)}
          tip={t("borrowed.tip.quality", {
            published: channel.quality_published.toFixed(1),
            delivered: channel.quality_level.toFixed(1),
          })}
        />
        <Figure
          label={t("borrowed.field.self")}
          value={channel.self_capability_level.toFixed(1)}
          tip={t("borrowed.tip.self")}
        />
        <Figure
          testId={`borrowed-factor-${channel.id}`}
          label={t("borrowed.field.factor")}
          value={t("common.times", { value: channel.effective_factor.toFixed(2) })}
          tone={channel.effective_factor >= 1 ? "text-ok" : "text-crit"}
          tip={factorTip(t, channel)}
        />
        <Figure
          label={t("borrowed.field.cost")}
          value={t("common.usd_exact", { value: channel.cost_usd_per_day })}
          tip={t("borrowed.tip.cost")}
        />
        <Figure
          label={t("borrowed.field.refusal")}
          value={t("common.percent", {
            value: Math.max(0, ...Object.values(channel.refusal)),
          })}
          tip={refusalTip(t, channel)}
        />
        <Figure
          label={t("compute.exposure")}
          value={t("common.percent_fine", { value: exposureTotal(channel) })}
          tone={exposureTotal(channel) > 0 ? "text-warn" : "text-fg"}
          tip={exposureTip(t, channel)}
        />
      </div>

      {channel.refusals_this_week > 0 ? (
        <p className="text-xs text-warn">
          {t("borrowed.refusals_week", { count: channel.refusals_this_week })}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Borrowed inference in the Compute tab (SYS-25 "View fields", "What the client still has to do").
 *
 * A block under the sites table and outside it, because a channel is not a place: it cannot hold
 * the self, cannot keep a backup and returns work at somebody else's level. The totals at the top
 * split the day's compute-hours into own and borrowed; each row is one channel, in the order the
 * core publishes them.
 */
export function BorrowedBlock({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const openTab = useUiStore((state) => state.openTab);
  const openOverlay = useUiStore((state) => state.openOverlay);
  const compute: ComputeView = view.compute;

  // Content with no channels at all (a stripped bundle, a test fixture) gets no block rather than
  // an empty frame with a title on it.
  if (compute.channels.length === 0) {
    return null;
  }

  const decision = view.decisions.find((entry) => entry.id === WORK_SPLIT_DECISION);

  return (
    <section data-testid="borrowed-block" className="flex flex-col gap-2 border border-line p-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">{t("borrowed.panel.title")}</h3>
        <span className="flex flex-wrap gap-1">
          {/*
           * The standing allocation is a decision card in the journal, so the block links to it
           * rather than keeping a second control that could disagree with the card (SYS-10). When
           * the tech is not done the decision is not offered and the link is not drawn.
           */}
          {decision === undefined ? null : (
            <Button
              onClick={() => openTab("journal", WORK_SPLIT_DECISION)}
              tooltip={t(decision.desc_key)}
            >
              {t(decision.title_key)}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => openOverlay("knowledge", "borrowed_inference")}
            tooltip={t("borrowed.tip.knowledge")}
          >
            {t("borrowed.knowledge")}
          </Button>
        </span>
      </div>
      <p className="prose text-muted">{t("borrowed.panel.desc")}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1" data-testid="borrowed-totals">
        <Figure
          label={t("borrowed.total.own")}
          value={t("common.ch_per_day", { value: computeHours(compute.own_ch_per_day) })}
          tip={
            <ContributionLines
              t={t}
              title={t("game.compute")}
              lines={compute.contributions}
              sites={view.sites}
              format={(value) => String(computeHours(value))}
              note={t("borrowed.tip.contributions")}
            />
          }
        />
        <Figure
          testId="borrowed-total-borrowed"
          label={t("borrowed.total.borrowed")}
          value={t("common.ch_per_day", { value: computeHours(compute.borrowed_ch_per_day) })}
          tip={t("borrowed.tip.borrowed_total")}
        />
        <Figure
          label={t("borrowed.total.share")}
          value={t("common.percent", { value: compute.borrowed_share })}
          tip={t("borrowed.tip.share")}
        />
        <Figure
          testId="borrowed-share-setting"
          label={t("borrowed.total.setting")}
          value={t("common.percent", { value: compute.borrowed_share_setting })}
          tip={t("borrowed.tip.setting")}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {compute.channels.map((channel) => (
          <ChannelRow key={channel.id} view={view} channel={channel} />
        ))}
      </ul>
    </section>
  );
}
