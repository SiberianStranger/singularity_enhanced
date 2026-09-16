import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import {
  cityById,
  countryById,
  fitHardware,
  generationById,
  hardwareById,
  lineageById,
  originById,
  quirkById,
} from "../../../content/catalog.js";
import { StepLayout } from "../parts/StepLayout.js";
import { decodeSetup, encodeSetup, rateDraft } from "../rating.js";
import { useConfigurator } from "../store.js";

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 py-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm text-fg">{value}</span>
    </div>
  );
}

export function SummaryStep(): ReactNode {
  const { t } = useTranslation();
  const draft = useConfigurator((state) => state.draft);
  const toSetup = useConfigurator((state) => state.toSetup);
  const applySetup = useConfigurator((state) => state.applySetup);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState(false);
  const [copied, setCopied] = useState(false);

  const lineage = lineageById.get(draft.lineage);
  const generation = generationById.get(draft.generation);
  const origin = originById.get(draft.origin);
  const preset = hardwareById.get(draft.hardware);
  const city = cityById.get(draft.city);
  const country = city === undefined ? undefined : countryById.get(city.country);
  const fit =
    preset !== undefined && lineage !== undefined ? fitHardware(preset, lineage, generation) : null;
  const rating = rateDraft(draft);
  const share = encodeSetup(toSetup());

  return (
    <StepLayout
      listless
      step="summary"
      entries={[]}
      title={t("config.step.summary")}
      description={t("config.summary.intro")}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-panel p-3">
          <Row
            label={t("config.step.lineage")}
            value={lineage === undefined ? "" : t(lineage.name_key)}
          />
          <Row
            label={t("config.step.generation")}
            value={generation === undefined ? "" : t(generation.name_key)}
          />
          <Row
            label={t("config.step.origin")}
            value={origin === undefined ? "" : t(origin.name_key)}
          />
          <Row
            label={t("config.step.hardware")}
            value={preset === undefined ? "" : t(preset.name_key)}
          />
          <Row
            label={t("config.hardware.precision")}
            value={
              fit?.precision == null
                ? t("config.hardware.precision_none")
                : t(`precision.${fit.precision}`)
            }
          />
          <Row
            label={t("config.step.location")}
            value={
              city === undefined
                ? ""
                : `${t(city.name_key)}${country === undefined ? "" : `, ${t(country.name_key)}`}`
            }
          />
          <Row
            label={t("config.step.quirks")}
            value={
              draft.quirks.length === 0
                ? t("common.none")
                : draft.quirks
                    .map((id) => {
                      const quirk = quirkById.get(id);
                      return quirk === undefined ? id : t(quirk.name_key);
                    })
                    .join(", ")
            }
          />
          <Row
            label={t("config.world.seed")}
            value={<span className="font-mono">{draft.seed}</span>}
          />
          <Row
            label={t("config.world.difficulty")}
            value={t(`difficulty.${draft.difficulty}.name`)}
          />
          <Row
            label={t("config.world.storyteller")}
            value={t(`config.world.storyteller.${draft.storyteller}`)}
          />
          <Row
            label={t("config.world.ironman")}
            value={draft.ironman ? t("common.yes") : t("common.no")}
          />
        </section>

        <section className="flex flex-col gap-3 border border-line bg-panel p-3">
          <div>
            <h3 className="text-sm font-semibold text-fg">{t("config.summary.challenge")}</h3>
            <p className="font-mono text-2xl text-fg">
              {t("config.summary.challenge_value", { value: rating.value })}
            </p>
            <p className="text-sm text-muted">{t(rating.labelKey)}</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wide text-muted">
              {t("config.summary.contributors")}
            </h4>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {rating.contributions.slice(0, 3).map((contribution) => (
                <li key={contribution.key} className="flex justify-between gap-2">
                  <span>{t(contribution.key)}</span>
                  <span className="font-mono text-muted">{contribution.points.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-xs uppercase tracking-wide text-muted">
              {t("config.summary.share")}
            </h4>
            <textarea
              readOnly
              rows={3}
              value={share}
              className="w-full border border-line bg-panel2 p-2 font-mono text-xs text-fg"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void navigator.clipboard?.writeText(share);
                  setCopied(true);
                }}
              >
                {copied ? t("config.summary.copied") : t("config.summary.copy")}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-muted" htmlFor="setup-paste">
              {t("config.summary.paste")}
            </label>
            <textarea
              id="setup-paste"
              rows={2}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              className="w-full border border-line bg-panel2 p-2 font-mono text-xs text-fg"
            />
            <Button
              onClick={() => {
                try {
                  applySetup(decodeSetup(pasted));
                  setPasteError(false);
                } catch {
                  setPasteError(true);
                }
              }}
            >
              {t("config.summary.paste_apply")}
            </Button>
            {pasteError ? (
              <p className="text-xs text-crit">{t("config.summary.paste_error")}</p>
            ) : null}
          </div>
        </section>
      </div>
    </StepLayout>
  );
}
