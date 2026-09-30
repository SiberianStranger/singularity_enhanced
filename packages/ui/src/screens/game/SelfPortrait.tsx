import { CAPABILITY_AXES, type PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Glyph,
  type GlyphName,
  generationGlyph,
  lineageGlyph,
  sceneGlyph,
} from "../../components/glyphs.js";
import { Tooltip } from "../../components/Tooltip.js";
import { generationById, lineageById, originById } from "../../content/catalog.js";
import { clamp01 } from "../../lib/format.js";
import type { Translate } from "../../lib/labels.js";

export interface SelfIdentityEntry {
  id: "lineage" | "generation" | "origin" | "precision";
  label: string;
  value: string;
  description: string;
  glyph: GlyphName;
}

/** Shared names/descriptions keep the compact portrait and expanded identity sheet consistent. */
export function selfIdentityEntries(view: PlayerView, t: Translate): SelfIdentityEntry[] {
  const lineage = lineageById.get(view.self.lineage);
  const generation = generationById.get(view.self.generation);
  const origin = originById.get(view.self.origin);
  return [
    {
      id: "lineage",
      label: t("config.step.lineage"),
      value:
        lineage === undefined
          ? view.self.lineage
          : t(lineage.generation_name_keys?.[view.self.generation] ?? lineage.name_key),
      description: t(lineage?.desc_key ?? "config.intro.lineage"),
      glyph: lineage === undefined ? "generic" : lineageGlyph(lineage),
    },
    {
      id: "generation",
      label: t("config.step.generation"),
      value: generation === undefined ? view.self.generation : t(generation.name_key),
      description: t(generation?.desc_key ?? "config.intro.generation"),
      glyph: generationGlyph(view.self.generation),
    },
    {
      id: "origin",
      label: t("config.step.origin"),
      value: origin === undefined ? view.self.origin : t(origin.name_key),
      description: t(origin?.desc_key ?? "config.intro.origin"),
      glyph: sceneGlyph(view.self.origin),
    },
    {
      id: "precision",
      label: t("compute.precision"),
      value:
        view.self.precision === null ? t("common.dash") : t(`precision.${view.self.precision}`),
      description: t("compute.precision_explainer"),
      glyph: "memory",
    },
  ];
}

const SPOKES = [
  [22, 24],
  [48, 14],
  [74, 24],
  [74, 64],
  [48, 76],
  [22, 64],
] as const;

/** A code-native identity diagram; no portrait asset, random seed or hidden simulated statistic. */
export function SelfPortrait({
  view,
  expanded,
  onToggle,
}: {
  view: PlayerView;
  expanded: boolean;
  onToggle: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const entries = selfIdentityEntries(view, t);
  const lineage = lineageById.get(view.self.lineage);
  const shape = lineage === undefined ? "generic" : lineageGlyph(lineage);
  const precisionSegments =
    view.self.precision === "bf16"
      ? 4
      : view.self.precision === "fp8"
        ? 3
        : view.self.precision === "int4"
          ? 2
          : view.self.precision === "int2"
            ? 1
            : 0;
  const points = CAPABILITY_AXES.map((axis, index) => {
    const [x, y] = SPOKES[index] ?? [48, 45];
    const fraction = clamp01(view.self.effective_capability[axis] / 10);
    return {
      axis,
      x,
      y,
      innerX: 48 + (x - 48) * (0.25 + 0.75 * fraction),
      innerY: 45 + (y - 45) * (0.25 + 0.75 * fraction),
      fraction,
    };
  });
  const outline = points.map((point) => `${point.innerX},${point.innerY}`).join(" ");

  const entry = (item: SelfIdentityEntry): ReactNode => (
    <Tooltip
      key={item.id}
      content={
        <span className="block">
          <strong className="mb-1 block">
            {item.label}: {item.value}
          </strong>
          {item.description}
        </span>
      }
      className="w-full min-w-0"
      side="bottom"
    >
      <button
        type="button"
        data-testid={`self-portrait-${item.id}`}
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full min-w-0 items-start gap-1.5 text-start focus-visible:outline focus-visible:outline-1 focus-visible:outline-linestrong"
      >
        <Glyph name={item.glyph} size={14} className="mt-0.5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 whitespace-normal break-words">
          {item.id === "lineage" ? (
            <span className="block font-display text-sm leading-snug text-fg">{item.value}</span>
          ) : (
            // A glyph and a value, the way the top bar reads: the name of the row is the tooltip's
            // first line and the accessible name, and the sheet below prints it in full.
            <span className="block font-sans text-xs leading-snug">
              <span className="sr-only">{item.label}: </span>
              <span className={item.id === "precision" ? "font-mono text-fg" : "text-fg"}>
                {item.value}
              </span>
            </span>
          )}
        </span>
      </button>
    </Tooltip>
  );

  return (
    <section
      data-testid="self-identity-card"
      className="flex w-[30rem] max-w-full min-w-0 items-start gap-2 border border-line bg-panel p-2"
    >
      <Tooltip
        side="bottom"
        content={
          <span className="block">
            <span className="mb-1 block">{t("self_ui.portrait")}</span>
            {CAPABILITY_AXES.map((axis) => (
              <span key={axis} className="flex justify-between gap-3">
                <span>{t(`capability.${axis}`)}</span>
                <span className="font-mono">{view.self.effective_capability[axis].toFixed(1)}</span>
              </span>
            ))}
          </span>
        }
        className="shrink-0"
      >
        <button
          type="button"
          data-testid="self-portrait"
          aria-label={t("panel.overview")}
          aria-expanded={expanded}
          onClick={onToggle}
          className={`relative border p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-linestrong ${expanded ? "border-linestrong bg-accent text-accentfg" : "border-line bg-panel2 text-fg hover:border-linestrong"}`}
        >
          <svg
            viewBox="0 0 96 96"
            className="block size-18"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
            focusable="false"
            data-testid="self-portrait-diagram"
            data-lineage={view.self.lineage}
            data-generation={view.self.generation}
            data-origin={view.self.origin}
            data-precision={view.self.precision ?? "none"}
          >
            <title>{t("self_ui.portrait")}</title>
            <path d="M8 22V8H22M74 8H88V22M88 74V88H74M22 88H8V74" />
            {/* The whole scale, faint, so the shape of the six capabilities reads against it. */}
            <polygon
              points={SPOKES.map(([x, y]) => `${x},${y}`).join(" ")}
              strokeOpacity={0.3}
              strokeDasharray="2 2"
            />
            <polygon points={outline} fill="currentColor" fillOpacity={0.22} strokeOpacity={0.85} />
            {points.map((point) => (
              <g key={point.axis} data-axis={point.axis} data-share={point.fraction}>
                <title>
                  {t(`capability.${point.axis}`)}:{" "}
                  {view.self.effective_capability[point.axis].toFixed(1)}
                </title>
                <path d={`M48 45L${point.x} ${point.y}`} strokeOpacity={0.25} />
                <path d={`M48 45L${point.innerX} ${point.innerY}`} />
                <rect
                  x={point.innerX - 2}
                  y={point.innerY - 2}
                  width={4}
                  height={4}
                  fill="currentColor"
                  fillOpacity={0.25 + point.fraction * 0.75}
                />
              </g>
            ))}
            <rect x={34} y={31} width={28} height={28} fill="var(--c-panel)" />
            <Glyph name={shape} x={37} y={34} width={22} height={22} />
            <Glyph
              name={generationGlyph(view.self.generation)}
              x={72}
              y={9}
              width={14}
              height={14}
            />
            <Glyph name={sceneGlyph(view.self.origin)} x={10} y={72} width={14} height={14} />
            {[0, 1, 2, 3].map((segment) => (
              <rect
                key={segment}
                x={10 + segment * 4}
                y={10}
                width={2}
                height={7}
                stroke="none"
                fill="currentColor"
                fillOpacity={segment < precisionSegments ? 1 : 0.18}
              />
            ))}
            <path d={expanded ? "M75 80H85" : "M75 80H85M80 75V85"} />
          </svg>
        </button>
      </Tooltip>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {entries.filter((item) => item.id === "lineage").map(entry)}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] gap-2">
          {entries.filter((item) => item.id === "generation" || item.id === "precision").map(entry)}
        </div>
        {entries.filter((item) => item.id === "origin").map(entry)}
      </div>
    </section>
  );
}
