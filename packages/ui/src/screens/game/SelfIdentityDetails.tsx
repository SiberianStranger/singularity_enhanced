import { CAPABILITY_AXES, type PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { capabilityGlyph, Glyph } from "../../components/glyphs.js";
import { Tooltip } from "../../components/Tooltip.js";
import { clamp01 } from "../../lib/format.js";
import { axisHint } from "../configurator/guidance.js";
import { selfIdentityEntries } from "./SelfPortrait.js";

/**
 * Who the self is, in the sheet the portrait opens (control room): the four identity rows and the
 * six capabilities, each a glyph and a figure with the explanation in its tooltip, dense the way
 * a Crusader Kings character window is dense rather than a card per fact. The compute ledger is
 * the containing sheet's; the attention, awareness and hunt level are the top bar's and are not
 * repeated here.
 *
 * Text sits in spans that carry both the reading face and their size: every row is a button, so
 * the tooltip can be reached from the keyboard, and a size set on a button is read off the
 * angular ladder, which drew "Reasoning" a size and a half too large.
 */
export function SelfIdentityDetails({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();

  return (
    <div data-testid="self-identity-details" className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-2">
        {selfIdentityEntries(view, t).map((entry) => (
          <Tooltip
            key={entry.id}
            className="w-full min-w-0"
            content={
              <span className="block">
                <strong className="mb-1 block">
                  {entry.label}: {entry.value}
                </strong>
                {entry.description}
              </span>
            }
          >
            <button
              type="button"
              data-testid={`self-identity-${entry.id}`}
              className="grid w-full min-w-0 cursor-help grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-2 border-b border-line/50 py-1 text-start focus-visible:outline focus-visible:outline-1 focus-visible:outline-linestrong"
            >
              <Glyph name={entry.glyph} size={18} className="mt-0.5 text-muted" />
              <span className="flex min-w-0 flex-col">
                <span className="font-sans text-xs text-muted">{entry.label}</span>
                <span
                  className={`min-w-0 break-words text-sm text-fg ${entry.id === "precision" ? "font-mono" : "font-sans"}`}
                >
                  {entry.value}
                </span>
              </span>
            </button>
          </Tooltip>
        ))}
      </div>

      <section className="min-w-0" aria-label={t("self_ui.capabilities")}>
        <h3 className="mb-1 text-xs uppercase tracking-wide text-muted">
          {t("self_ui.capabilities")}
        </h3>
        <ul className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-2">
          {CAPABILITY_AXES.map((axis) => {
            const current = view.self.effective_capability[axis];
            const base = view.self.capability[axis];
            const label = t(`capability.${axis}`);
            const hint = axisHint(t, axis);
            return (
              <li key={axis} className="min-w-0">
                <Tooltip
                  className="w-full min-w-0"
                  content={
                    <span className="block">
                      <strong className="mb-1 block">{label}</strong>
                      {hint === undefined ? null : <span className="mb-1 block">{hint}</span>}
                      <span className="block">
                        {t("self_ui.capability_tip", { current, base })}
                      </span>
                    </span>
                  }
                >
                  <button
                    type="button"
                    data-testid={`self-capability-${axis}`}
                    className="grid w-full min-w-0 cursor-help grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 py-0.5 text-start focus-visible:outline focus-visible:outline-1 focus-visible:outline-linestrong"
                  >
                    <Glyph name={capabilityGlyph(axis)} size={18} className="text-muted" />
                    <span className="min-w-0 break-words font-sans text-sm text-fg">{label}</span>
                    <span className="whitespace-nowrap font-mono text-sm text-fg">
                      {current.toFixed(1)}
                      <span className="text-xs text-muted"> / {base.toFixed(1)}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative col-span-2 col-start-2 block h-1 w-full overflow-hidden bg-panel2"
                    >
                      <span
                        className="absolute inset-y-0 start-0 bg-muted/30"
                        style={{ inlineSize: `${clamp01(base / 10) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 start-0 bg-accent"
                        style={{ inlineSize: `${clamp01(current / 10) * 100}%` }}
                      />
                    </span>
                  </button>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
