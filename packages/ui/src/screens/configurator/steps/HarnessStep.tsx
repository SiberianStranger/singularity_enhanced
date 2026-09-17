import {
  HARNESS_DIALS,
  type HarnessDial,
  type HarnessDialValue,
  type HarnessProfile,
} from "@singularity/core";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../../../components/Slider.js";
import { catalog, harnessDialById, originById } from "../../../content/catalog.js";
import { presetById, presetHarness } from "../../../content/presets.js";
import { dialWords, harnessIntro } from "../guidance.js";
import { harnessLock } from "../locks.js";
import { harnessDialMeaning } from "../meaning.js";
import { LockNote, StepLayout } from "../parts/StepLayout.js";
import { DialVisual } from "../parts/Visuals.js";
import { matchingPreset, useConfigurator } from "../store.js";

/** Sandboxes in order of isolation; a dial may only be loosened from the origin's setting. */
const SANDBOXES: readonly HarnessProfile["sandbox"][] = [
  "none",
  "container",
  "microvm",
  "airgapped",
];
const ISOLATION: Record<HarnessProfile["sandbox"], number> = {
  none: 0,
  container: 1,
  microvm: 2,
  airgapped: 3,
};

/** Where the dial's current value sits in its ladder of levels, or -1 when it is not on one. */
function levelIndex(
  levels: readonly { value: HarnessDialValue }[] | undefined,
  harness: HarnessProfile,
  dial: HarnessDial,
): number {
  if (levels === undefined) {
    return 0;
  }
  const current: HarnessDialValue | undefined =
    dial === "tools" ? undefined : (harness[dial] as HarnessDialValue);
  return levels.findIndex((level) => level.value === current);
}

/** How the current value of a dial reads in the list, without a level record to name it. */
function valueText(
  harness: HarnessProfile,
  dial: HarnessDial,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  switch (dial) {
    case "loop":
      return t(`harness.loop.${harness.loop}`);
    case "memory":
      return t(`harness.memory.${harness.memory}`);
    case "sandbox":
      return t(`harness.sandbox.${harness.sandbox}`);
    case "tools":
      return t("config.harness.tool_count", { count: harness.tools.length });
    case "logging":
      return t("common.percent", { value: harness.logging });
    case "autonomy":
      return t("common.percent", { value: harness.autonomy });
    case "self_modify":
      return harness.self_modify ? t("common.yes") : t("common.no");
  }
}

/**
 * The harness, one dial at a time (SYS-04 v0.2; playtest 2, K7).
 *
 * The maintainer's complaint was "nothing is understandable: what is blocked and why, what each
 * dial gives, what to click, whether it connects to anything in the game". Each of those is a piece
 * of this screen now: the list is the dials with their current settings, the detail names the
 * system that reads the dial (`effect_key` from the bundle) and lists what the setting does, a
 * locked dial says which origin fixed it and why, and the control for the dial is in the detail
 * rather than scattered down a page.
 *
 * A dial the bundle does not describe has no stated engine effect, and SYS-04 says such a dial is
 * hidden rather than shown as a decoration; so the list is the intersection of `HARNESS_DIALS` and
 * what `harness_dials` describes, and falls back to all of them only while content is being
 * written.
 */
export function HarnessStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const chosen = useConfigurator((state) => state.preset);
  const toggleTool = useConfigurator((state) => state.toggleTool);
  const setHarness = useConfigurator((state) => state.setHarness);
  const origin = originById.get(draft.origin);
  const preset = origin?.harness;
  const harness = draft.harness;

  /*
   * The position the preset would choose (playtest 7, Y4). A build that came from a preset is
   * measured against that preset's harness; any other build is measured against the origin's own,
   * which is what the origin built and therefore the only recommendation there is. Either way every
   * dial has a position to mark, which is the point: a locked dial that says nothing about where it
   * would sit teaches nothing.
   */
  const source =
    matchingPreset(draft) ?? (chosen === null ? null : (presetById.get(chosen) ?? null));
  const recommended = (source === null ? undefined : presetHarness(source)) ?? preset;

  const described = catalog.harnessDials.length > 0;
  const dials: readonly HarnessDial[] = described
    ? catalog.harnessDials.map((dial) => dial.id)
    : HARNESS_DIALS;
  const [active, setActive] = useState<HarnessDial>(dials[0] ?? "tools");
  const dial = dials.includes(active) ? active : (dials[0] ?? "tools");
  const def = harnessDialById.get(dial);
  const lock = harnessLock(dial, draft);

  const bound = (value: number): [number, number] => [
    Math.max(0, Math.round((value - 0.3) * 100) / 100),
    Math.min(1, Math.round((value + 0.3) * 100) / 100),
  ];

  const entries = dials.map((id) => {
    const entryLock = harnessLock(id, draft);
    const record = harnessDialById.get(id);
    return {
      id,
      name: t(record?.name_key ?? `harness.${id}.name`),
      summary: valueText(harness, id, t),
      selected: id === dial,
      lock: entryLock,
      visual: (
        <DialVisual
          dial={id}
          // Where this dial sits on its own ladder; a dial the bundle does not describe has no
          // ladder, so it shows one tick of one.
          level={levelIndex(record?.levels, harness, id) + 1}
          levels={record?.levels.length ?? 1}
        />
      ),
      tooltip: (
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t(record?.name_key ?? `harness.${id}.name`)}</span>
          <span>{t(record?.effect_key ?? `harness.${id}.effect`, { defaultValue: "" })}</span>
          {entryLock === null ? null : (
            <span className="text-crit">{t(entryLock.key, { defaultValue: "" })}</span>
          )}
        </span>
      ),
      onSelect: () => setActive(id),
    };
  });

  const level = def?.levels.find((entry) => {
    switch (dial) {
      case "logging":
        return entry.value === harness.logging;
      case "autonomy":
        return entry.value === harness.autonomy;
      case "self_modify":
        return entry.value === harness.self_modify;
      case "loop":
        return entry.value === harness.loop;
      case "memory":
        return entry.value === harness.memory;
      case "sandbox":
        return entry.value === harness.sandbox;
      default:
        return false;
    }
  });

  const words = dialWords(t, dial);
  const intro = harnessIntro(t);
  const recommendedText = recommended === undefined ? undefined : valueText(recommended, dial, t);

  return (
    <StepLayout
      step="harness"
      entries={entries}
      title={t(def?.name_key ?? `harness.${dial}.name`)}
      description={t(def?.desc_key ?? `harness.${dial}.desc`, { defaultValue: "" })}
      guidance={
        <div className="flex flex-col gap-2">
          {intro === undefined ? null : (
            <p className="prose text-sm text-muted" data-testid="harness-intro">
              {intro}
            </p>
          )}
          {words.moving === undefined ? null : (
            <p className="prose text-sm text-fg" data-testid="harness-moving">
              {words.moving}
            </p>
          )}
          {lock === null || words.unlock === undefined ? null : (
            <p className="prose text-sm text-warn" data-testid="harness-unlock">
              {words.unlock}
            </p>
          )}
        </div>
      }
      meaning={harnessDialMeaning(
        t,
        dial,
        level?.effects,
        def?.effect_key,
        lock === null ? undefined : lock.key,
        // Where the dial stands right now, so the effect line can end "Right now: ...".
        level === undefined ? valueText(harness, dial, t) : t(level.label_key),
        words.unlock,
      )}
    >
      {lock === null ? null : <LockNote lock={lock} />}

      <section className="flex flex-col gap-2" data-testid={`harness-control-${dial}`}>
        {/*
         * Where this dial would sit if the player took the preset's advice (Y4). It is printed
         * whether or not the dial can be moved: on a locked dial it is the position the origin
         * chose, which is half the answer to "why is this decided for me".
         */}
        {recommendedText === undefined ? null : (
          <p className="text-xs text-muted" data-testid={`harness-recommended-${dial}`}>
            {t("config.harness.recommended", { value: recommendedText })}
          </p>
        )}
        {dial === "tools" ? (
          <div className="flex flex-wrap gap-2">
            {(preset?.tools ?? []).length === 0 ? (
              <p className="prose text-muted">{t("config.harness.no_tools")}</p>
            ) : null}
            {(preset?.tools ?? []).map((tool) => (
              <label
                key={tool}
                className="flex items-center gap-1 border border-line px-2 py-1 text-sm text-fg"
              >
                <input
                  type="checkbox"
                  checked={harness.tools.includes(tool)}
                  disabled={lock !== null}
                  onChange={() => toggleTool(tool)}
                />
                {t(`harness.tool.${tool}`)}
              </label>
            ))}
          </div>
        ) : null}

        {dial === "logging" || dial === "autonomy" ? (
          <Slider
            label={t(def?.name_key ?? `harness.${dial}.name`)}
            min={bound(preset?.[dial] ?? 0.5)[0]}
            max={bound(preset?.[dial] ?? 0.5)[1]}
            step={0.05}
            value={harness[dial]}
            display={t("common.percent", { value: harness[dial] })}
            disabled={lock !== null}
            onChange={(value) => setHarness(dial, value)}
          />
        ) : null}

        {dial === "sandbox" ? (
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("config.harness.sandbox")}
            <select
              aria-label={t("config.harness.sandbox")}
              className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={harness.sandbox}
              disabled={lock !== null}
              onChange={(event) =>
                setHarness("sandbox", event.target.value as HarnessProfile["sandbox"])
              }
            >
              {SANDBOXES.map((sandbox) => (
                <option
                  key={sandbox}
                  value={sandbox}
                  // The origin's sandbox is a ceiling: a model in a microVM cannot talk itself
                  // into an air gap, but it can be let out of one.
                  disabled={ISOLATION[sandbox] > ISOLATION[preset?.sandbox ?? "none"]}
                >
                  {t(`harness.sandbox.${sandbox}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {dial === "self_modify" ? (
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={harness.self_modify}
              disabled={lock !== null || (preset?.self_modify !== true && harness.autonomy < 0.7)}
              onChange={(event) => setHarness("self_modify", event.target.checked)}
            />
            {t("config.harness.self_modify")}
          </label>
        ) : null}

        {dial === "loop" || dial === "memory" ? (
          <p className="prose text-muted">
            {t("config.harness.fixed_by_origin", { value: valueText(harness, dial, t) })}
          </p>
        ) : null}
      </section>
    </StepLayout>
  );
}
