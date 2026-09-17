import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { catalog } from "../../content/catalog.js";
import { accelerator } from "../../lib/accelerators.js";
import { useGameStore } from "../../store/gameStore.js";
import { BuildLine } from "./parts/BuildLine.js";
import { StepRail } from "./parts/StepRail.js";
import { GenerationStep } from "./steps/GenerationStep.js";
import { HardwareStep } from "./steps/HardwareStep.js";
import { HarnessStep } from "./steps/HarnessStep.js";
import { LineageStep } from "./steps/LineageStep.js";
import { LocationStep } from "./steps/LocationStep.js";
import { OriginStep } from "./steps/OriginStep.js";
import { PresetsStep } from "./steps/PresetsStep.js";
import { QuirksStep } from "./steps/QuirksStep.js";
import { SummaryStep } from "./steps/SummaryStep.js";
import { WorldStep } from "./steps/WorldStep.js";
import { STEP_IDS, type StepId } from "./steps.js";
import { useConfigurator } from "./store.js";

const CONTENT: Readonly<Record<StepId, ReactNode>> = {
  presets: <PresetsStep />,
  lineage: <LineageStep />,
  generation: <GenerationStep />,
  origin: <OriginStep />,
  hardware: <HardwareStep />,
  harness: <HarnessStep />,
  location: <LocationStep />,
  quirks: <QuirksStep />,
  world: <WorldStep />,
  summary: <SummaryStep />,
};

/**
 * The start configurator (SYS-04 v0.2; playtest 2, K1 and K4).
 *
 * A fixed frame that fits 1366 by 768 and never scrolls the page: three rows that do not shrink
 * (the title bar, the content, the footer) with the step rail down the left of the content and the
 * step's own master-detail to the right of it. Everything that can be longer than the screen
 * scrolls inside its own frame, which is rule 11 of the style guide.
 *
 * The footer keeps Random build, Reroll and Back/Next; every accelerator is a letter of its own
 * label in the language on screen (`<key>.key` in the locale), chosen so that none of them
 * collides with a step's letter on the rail, and a test asserts that uniqueness on the rendered
 * screen in every language rather than on a table.
 */
export function ConfiguratorScreen(): ReactNode {
  const { t } = useTranslation();
  const step = useConfigurator((state) => state.step);
  const goToStep = useConfigurator((state) => state.goToStep);
  const randomize = useConfigurator((state) => state.randomize);
  const reroll = useConfigurator((state) => state.reroll);
  const rerolls = useConfigurator((state) => state.rerolls);
  const toSetup = useConfigurator((state) => state.toSetup);
  const startGame = useGameStore((state) => state.startGame);
  const goTo = useGameStore((state) => state.goTo);
  const busy = useGameStore((state) => state.busy);
  const index = Math.min(Math.max(0, step), STEP_IDS.length - 1);
  const id = STEP_IDS[index] ?? "presets";
  const last = index === STEP_IDS.length - 1;

  return (
    <main
      id="main"
      data-testid="configurator"
      className="grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-bg"
    >
      <header className="flex shrink-0 items-baseline gap-3 border-b border-line bg-panel px-3 py-1">
        <h1 className="text-base uppercase tracking-wide text-fg">{t("config.title")}</h1>
        <span className="font-mono text-xs text-muted">
          {t("config.step_of", { index: index + 1, total: STEP_IDS.length })}
        </span>
        {catalog.missingDomains.length > 0 ? (
          <span className="border border-warn px-2 text-xs text-warn">
            {t("config.missing_content", { domains: catalog.missingDomains.join(", ") })}
          </span>
        ) : null}
      </header>

      {/*
       * The rail's column budget (playtest 5, continuation; playtest 6, X12): 13rem holds the
       * longest Russian step name, "ПРОИСХОЖДЕНИЕ", on one line at 1280 by 720 beside its state
       * mark, at the angular face's own size, so no rail row is taller than the others. It grew a
       * rem when the display ladder did and lost the key cap that used to sit in front of the
       * name; the rem came from the step frame, which still leaves the detail pane above the
       * 36rem its two columns switch on.
       */}
      <div className="grid min-h-0 grid-cols-[minmax(8rem,13rem)_minmax(0,1fr)]">
        <StepRail />
        {CONTENT[id]}
      </div>

      {/*
       * The footer is two rows (playtest 6, X12): the build line across the whole width, and the
       * buttons under it. It was one row until the angular face grew to its readable size, and a
       * line of five names between two groups of buttons is the first thing a wider button eats:
       * at 1280 by 720 the English line was already being cut, and the Russian one had been cut
       * since it existed. A row costs 20 px of height, which the step frame has.
       */}
      <footer className="flex shrink-0 flex-col gap-1 overflow-hidden border-t border-line bg-panel px-3 py-2">
        <BuildLine />
        <div className="flex items-center gap-2">
          <Button
            hotkey={accelerator(t, index === 0 ? "config.abandon" : "common.back")}
            onClick={() => (index === 0 ? goTo("menu") : goToStep(index - 1))}
          >
            {index === 0 ? t("config.abandon") : t("common.back")}
          </Button>
          <Button hotkey={accelerator(t, "config.random_build")} onClick={randomize}>
            {t("config.random_build")}
          </Button>
          <Button
            hotkey={accelerator(t, "config.reroll")}
            disabled={rerolls <= 0}
            tooltip={rerolls <= 0 ? t("config.no_rerolls") : undefined}
            onClick={reroll}
          >
            {t("config.reroll", { left: rerolls })}
          </Button>
          <span className="flex-1" />
          {last ? (
            <Button
              variant="primary"
              hotkey={accelerator(t, "config.begin")}
              disabled={busy}
              onClick={() => {
                void startGame(toSetup());
              }}
            >
              {t("config.begin")}
            </Button>
          ) : (
            <Button
              variant="primary"
              hotkey={accelerator(t, "common.next")}
              onClick={() => goToStep(index + 1)}
            >
              {t("common.next")}
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
