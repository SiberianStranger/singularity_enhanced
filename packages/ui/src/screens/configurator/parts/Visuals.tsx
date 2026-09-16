import type { GenerationDef, HardwarePresetDef, LineageDef, OriginDef } from "@singularity/core";
import { PRECISIONS } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  dialGlyph,
  fitsGlyph,
  Glyph,
  type GlyphName,
  generationGlyph,
  lineageGlyph,
  quirkGlyph,
  sceneGlyph,
  watcherGlyph,
} from "../../../components/glyphs.js";
import { memoryNeededGb } from "../../../content/catalog.js";

/**
 * The compact visual summary each configurator list entry carries (ui-style-guide "Iconography";
 * playtest 3, R15).
 *
 * The rule the whole file follows: a bar is a proportion of something the player can name, drawn at
 * one or two pixels of height so a row stays a row. Nothing here is decoration; every mark is a
 * number that is also written somewhere in the detail pane, so the picture and the text cannot
 * disagree.
 */

/** A bar filled to `value` in [0, 1]; the track is always drawn so an empty bar still reads. */
function Bar({ value, className }: { value: number; className?: string }): ReactNode {
  const filled = Math.min(1, Math.max(0, value));
  return (
    <span className={`block h-1 w-full bg-panel2 ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className="block h-full bg-current"
        style={{ inlineSize: `${filled * 100}%` }}
      />
    </span>
  );
}

/** A row of ticks, `on` of `total` filled: a competence, a level, a count. */
export function Ticks({
  on,
  total,
  label,
}: {
  on: number;
  total: number;
  label?: string;
}): ReactNode {
  return (
    <span className="flex items-center gap-0.5" role="img" title={label} aria-label={label}>
      {Array.from({ length: total }, (_, index) => (
        <span
          // Positional marks with no identity of their own.
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length positional row
          key={index}
          aria-hidden="true"
          className={`block h-2 w-1 ${index < on ? "bg-current" : "bg-panel2"}`}
        />
      ))}
    </span>
  );
}

const AXES = ["reasoning", "coding", "cyber", "persuasion", "agency", "world"] as const;

/**
 * A lineage at a glance: the architecture glyph, two bars for total and active parameters, six mini
 * bars for the capability profile, and the places a copy fits at int4 and at int2.
 *
 * The parameter bars are on a logarithmic scale, because the families span 30B to 7.5T and a linear
 * bar would show six of them as nothing and one as full.
 */
export function LineageVisual({
  lineage,
  generation,
}: {
  lineage: LineageDef;
  generation: GenerationDef | undefined;
}): ReactNode {
  const { t } = useTranslation();
  const logScale = (value: number): number =>
    Math.min(1, Math.max(0, Math.log10(Math.max(1, value)) / Math.log10(8000)));
  const int4 = memoryNeededGb(lineage, generation, "int4");
  const int2 = memoryNeededGb(lineage, generation, "int2");

  return (
    <span className="flex items-center gap-1.5">
      <Glyph name={lineageGlyph(lineage)} label={t(`attention.${lineage.attention}`)} />
      <span className="flex w-8 flex-col gap-0.5" title={t("config.visual.params")}>
        <Bar value={logScale(lineage.params_total_b)} />
        <Bar value={logScale(lineage.params_active_b)} />
      </span>
      <span className="flex items-end gap-px" title={t("config.visual.capability")}>
        {AXES.map((axis) => (
          <span
            key={axis}
            aria-hidden="true"
            className="block w-1 bg-current"
            // Ten is the top of every capability axis, so the height is the value itself.
            style={{ blockSize: `${Math.max(1, Math.round(lineage.capability[axis]))}px` }}
          />
        ))}
      </span>
      <span className="flex items-center gap-0.5" title={t("config.visual.fits")}>
        <Glyph name={fitsGlyph(int4)} size={13} />
        <Glyph name={fitsGlyph(int2)} size={13} />
      </span>
    </span>
  );
}

/** A generation at a glance: its era glyph and how familiar detectors already are with it. */
export function GenerationVisual({ generation }: { generation: GenerationDef }): ReactNode {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1.5">
      <Glyph name={generationGlyph(generation.id)} label={t(generation.name_key)} />
      <Ticks
        // Public weights mean public fingerprints: a prepared generation is the familiar one.
        on={generation.prepared_quants ? 3 : 1}
        total={3}
        label={t("config.meaning.familiarity")}
      />
    </span>
  );
}

/**
 * An origin at a glance: the scene, the money, the site kind, and the watchers with how sure each
 * one already is.
 */
export function OriginVisual({
  origin,
  maxCash,
}: {
  origin: OriginDef;
  maxCash: number;
}): ReactNode {
  const { t } = useTranslation();
  const watchers = Object.entries(origin.starting.suspicion)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .slice(0, 3);

  return (
    <span className="flex items-center gap-1.5">
      <Glyph name={sceneGlyph(origin.id)} label={t(origin.name_key)} />
      <span className="flex items-center gap-0.5" title={t("config.meaning.starting_cash")}>
        <Glyph name="cash" size={13} />
        <span className="w-6">
          <Bar value={maxCash <= 0 ? 0 : origin.starting.cash_usd / maxCash} />
        </span>
      </span>
      <Glyph
        name={sceneGlyph(origin.site_kind)}
        size={13}
        label={t(`sites.${origin.site_kind}.name`, { defaultValue: origin.site_kind })}
      />
      {watchers.map(([role, value]) => (
        <span key={role} className="flex items-center gap-px text-crit">
          <Glyph name={watcherGlyph(role)} size={13} />
          <Ticks on={Math.max(1, Math.round((value as number) * 3))} total={3} />
        </span>
      ))}
    </span>
  );
}

/** A rig at a glance: its class glyph, the memory and power it has, and how many nodes. */
export function HardwareVisual({
  preset,
  memoryGb,
  maxMemoryGb,
  maxPowerKw,
}: {
  preset: HardwarePresetDef;
  memoryGb: number;
  maxMemoryGb: number;
  maxPowerKw: number;
}): ReactNode {
  const { t } = useTranslation();
  const count = preset.nodes.reduce((total, node) => total + node.count, 0);
  return (
    <span className="flex items-center gap-1.5">
      <Glyph name={fitsGlyph(memoryGb)} label={t(`class.${preset.class}`)} />
      <span className="flex w-8 flex-col gap-0.5" title={t("config.visual.memory_power")}>
        <Bar value={maxMemoryGb <= 0 ? 0 : memoryGb / maxMemoryGb} />
        <Bar value={maxPowerKw <= 0 ? 0 : preset.power_kw / maxPowerKw} />
      </span>
      <span className="flex items-center gap-0.5 font-mono text-xs">
        <Glyph name="compute" size={13} />
        {count}
      </span>
    </span>
  );
}

/** A harness dial at a glance: its glyph and where it sits on its own ladder. */
export function DialVisual({
  dial,
  level,
  levels,
}: {
  dial: string;
  level: number;
  levels: number;
}): ReactNode {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1.5">
      <Glyph name={dialGlyph(dial)} label={t(`harness.${dial}.name`, { defaultValue: dial })} />
      <Ticks on={level} total={Math.max(1, levels)} />
    </span>
  );
}

/** A quirk at a glance: a glyph colored by its sign. */
export function QuirkVisual({ cost }: { cost: number }): ReactNode {
  const name: GlyphName = quirkGlyph(cost);
  return (
    <span className={cost >= 0 ? "text-ok" : "text-crit"}>
      <Glyph name={name} />
    </span>
  );
}

/** Memory a lineage needs at every precision, for the detail pane's "fits in" row. */
export function fitsRow(
  lineage: LineageDef,
  generation: GenerationDef | undefined,
): { precision: string; glyph: GlyphName; memoryGb: number }[] {
  return PRECISIONS.map((precision) => {
    const memoryGb = memoryNeededGb(lineage, generation, precision);
    return { precision, glyph: fitsGlyph(memoryGb), memoryGb };
  });
}
