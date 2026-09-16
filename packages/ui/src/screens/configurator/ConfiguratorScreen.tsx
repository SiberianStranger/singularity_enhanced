import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { catalog } from "../../content/catalog.js";
import { useGameStore } from "../../store/gameStore.js";
import { GenerationStep } from "./steps/GenerationStep.js";
import { HardwareStep } from "./steps/HardwareStep.js";
import { HarnessStep } from "./steps/HarnessStep.js";
import { LineageStep } from "./steps/LineageStep.js";
import { LocationStep } from "./steps/LocationStep.js";
import { OriginStep } from "./steps/OriginStep.js";
import { QuirksStep } from "./steps/QuirksStep.js";
import { SummaryStep } from "./steps/SummaryStep.js";
import { WorldStep } from "./steps/WorldStep.js";
import { useConfigurator } from "./store.js";

const STEPS = [
  { id: "lineage", element: <LineageStep /> },
  { id: "generation", element: <GenerationStep /> },
  { id: "origin", element: <OriginStep /> },
  { id: "hardware", element: <HardwareStep /> },
  { id: "harness", element: <HarnessStep /> },
  { id: "location", element: <LocationStep /> },
  { id: "quirks", element: <QuirksStep /> },
  { id: "world", element: <WorldStep /> },
  { id: "summary", element: <SummaryStep /> },
] as const;

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
  const current = STEPS[step] ?? STEPS[0];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-fg">{t("config.title")}</h1>
        <p className="text-xs text-muted">
          {t("config.step_of", { index: step + 1, total: STEPS.length })}
        </p>
      </header>

      <nav aria-label={t("config.title")} className="flex flex-wrap gap-1">
        {STEPS.map((entry, index) => (
          <Button
            key={entry.id}
            variant={index === step ? "primary" : "ghost"}
            onClick={() => goToStep(index)}
          >
            {t(`config.step.${entry.id}`)}
          </Button>
        ))}
      </nav>

      {catalog.usedFallback.length > 0 ? (
        <p className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          {t("config.fallback_notice")}
        </p>
      ) : null}

      <section className="flex-1">{current.element}</section>

      <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-line bg-bg/95 py-3">
        <Button onClick={() => (step === 0 ? goTo("menu") : goToStep(step - 1))}>
          {step === 0 ? t("config.abandon") : t("common.back")}
        </Button>
        <Button onClick={randomize}>{t("config.random_build")}</Button>
        <Button disabled={rerolls <= 0} onClick={reroll}>
          {t("config.reroll", { left: rerolls })}
        </Button>
        <span className="flex-1" />
        {last ? (
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => {
              void startGame(toSetup());
            }}
          >
            {t("config.begin")}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => goToStep(step + 1)}>
            {t("common.next")}
          </Button>
        )}
      </footer>
    </main>
  );
}
