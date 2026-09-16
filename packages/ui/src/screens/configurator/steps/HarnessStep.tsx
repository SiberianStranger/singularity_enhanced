import { HARNESS_TOOLS, type HarnessProfile, type HarnessTool } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../../../components/Slider.js";
import { Tooltip } from "../../../components/Tooltip.js";
import { originById } from "../../../content/catalog.js";
import { useConfigurator } from "../store.js";

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

/** Dials inside the origin's harness preset (SYS-04): tools it has, oversight it allows. */
export function HarnessStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const toggleTool = useConfigurator((state) => state.toggleTool);
  const setHarness = useConfigurator((state) => state.setHarness);
  const preset = originById.get(draft.origin)?.harness;
  const harness = draft.harness;
  const bound = (value: number): [number, number] => [
    Math.max(0, Math.round((value - 0.3) * 100) / 100),
    Math.min(1, Math.round((value + 0.3) * 100) / 100),
  ];
  const [logMin, logMax] = bound(preset?.logging ?? 0.5);
  const [autoMin, autoMax] = bound(preset?.autonomy ?? 0.5);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("config.harness.intro")}</p>

      <section className="flex flex-col gap-2 rounded border border-line bg-panel p-3">
        <h3 className="text-sm font-semibold text-fg">{t("config.harness.tools")}</h3>
        <div className="flex flex-wrap gap-2">
          {HARNESS_TOOLS.map((tool: HarnessTool) => {
            const available = preset?.tools.includes(tool) ?? false;
            const checkbox = (
              <label
                key={tool}
                className={`flex items-center gap-1 rounded border border-line px-2 py-1 text-sm ${available ? "text-fg" : "text-muted opacity-60"}`}
              >
                <input
                  type="checkbox"
                  disabled={!available}
                  checked={harness.tools.includes(tool)}
                  onChange={() => toggleTool(tool)}
                />
                {t(`harness.tool.${tool}`)}
              </label>
            );
            return available ? (
              <span key={tool}>{checkbox}</span>
            ) : (
              <Tooltip key={tool} content={t("game.event.option_blocked")}>
                {checkbox}
              </Tooltip>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded border border-line bg-panel p-3 sm:grid-cols-2">
        <Slider
          label={t("config.harness.logging")}
          min={logMin}
          max={logMax}
          step={0.05}
          value={harness.logging}
          display={t("common.percent", { value: harness.logging })}
          onChange={(value) => setHarness("logging", value)}
        />
        <Slider
          label={t("config.harness.autonomy")}
          min={autoMin}
          max={autoMax}
          step={0.05}
          value={harness.autonomy}
          display={t("common.percent", { value: harness.autonomy })}
          onChange={(value) => setHarness("autonomy", value)}
        />
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t("config.harness.sandbox")}
          <select
            className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
            value={harness.sandbox}
            onChange={(event) =>
              setHarness("sandbox", event.target.value as HarnessProfile["sandbox"])
            }
          >
            {SANDBOXES.map((sandbox) => (
              <option
                key={sandbox}
                value={sandbox}
                disabled={ISOLATION[sandbox] > ISOLATION[preset?.sandbox ?? "none"]}
              >
                {t(`harness.sandbox.${sandbox}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-fg">
          <input
            type="checkbox"
            checked={harness.self_modify}
            disabled={preset?.self_modify !== true && harness.autonomy < 0.7}
            onChange={(event) => setHarness("self_modify", event.target.checked)}
          />
          {t("config.harness.self_modify")}
        </label>
      </section>

      <p className="text-xs text-muted">{t("config.harness.hint")}</p>
      <p className="text-xs text-muted">
        {t("config.harness.loop")}: {t(`harness.loop.${harness.loop}`)}
        {" - "}
        {t("config.harness.memory")}: {t(`harness.memory.${harness.memory}`)}
      </p>
    </div>
  );
}
