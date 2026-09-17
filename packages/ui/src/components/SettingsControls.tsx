import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { music } from "../audio/index.js";
import { availableLanguages, languageName } from "../i18n/index.js";
import {
  DISPLAY_SCALE_MAX,
  DISPLAY_SCALE_MIN,
  type FontFace,
  THEMES,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
  useUiStore,
} from "../store/uiStore.js";
import { Slider } from "./Slider.js";

/** The angular face on labels and numbers, or the readable face everywhere (playtest 3, R5). */
const FONTS: readonly FontFace[] = ["original", "plain"];

/**
 * The line under a control that says what it does (playtest 6, X5).
 *
 * Every control in this panel has one, in the one style the panel already used for the font note,
 * so a setting never has to be tried to be understood. A language that has not translated a note
 * yet prints nothing rather than its key.
 */
function Note({ text }: { text: string }): ReactNode {
  return text === "" ? null : <p className="text-xs text-muted">{text}</p>;
}

/** A volume slider with its own mute, the pair the style guide asks for on each channel. */
function VolumeRow({
  label,
  volume,
  muted,
  muteLabel,
  onVolume,
  onMute,
}: {
  label: string;
  volume: number;
  muted: boolean;
  muteLabel: string;
  onVolume: (value: number) => void;
  onMute: (value: boolean) => void;
}): ReactNode {
  return (
    <div className="flex items-end gap-3">
      <Slider
        label={label}
        min={0}
        max={100}
        step={5}
        // A mute keeps the level, so the slider still shows where the volume will come back to.
        value={Math.round(volume * 100)}
        display={`${Math.round(volume * 100)}%`}
        disabled={muted}
        // A setting is not a command: it takes effect as the player moves it.
        commitMs={0}
        onChange={(value) => onVolume(value / 100)}
      />
      <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted">
        <input type="checkbox" checked={muted} onChange={(event) => onMute(event.target.checked)} />
        {muteLabel}
      </label>
    </div>
  );
}

/**
 * Language, theme, text size, sound and the CRT overlay; shared by the menu dialog and the in-game
 * Settings section (playtest 1 U5, playtest 2 S1 and S2).
 */
export function SettingsControls(): ReactNode {
  const { t } = useTranslation();
  const { theme, language, setTheme, setLanguage } = useUiStore();
  const uiScale = useUiStore((state) => state.uiScale);
  const setUiScale = useUiStore((state) => state.setUiScale);
  const uiScaleAuto = useUiStore((state) => state.uiScaleAuto);
  const setUiScaleAuto = useUiStore((state) => state.setUiScaleAuto);
  const displayScale = useUiStore((state) => state.displayScale);
  const setDisplayScale = useUiStore((state) => state.setDisplayScale);
  const fontFace = useUiStore((state) => state.fontFace);
  const setFontFace = useUiStore((state) => state.setFontFace);
  const audio = useUiStore((state) => state.audio);
  const setAudio = useUiStore((state) => state.setAudio);
  const crt = useUiStore((state) => state.crt);
  const setCrt = useUiStore((state) => state.setCrt);
  const languages = availableLanguages();

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t("settings.language")}
        <select
          className="border border-line bg-panel2 px-2 py-1 text-sm text-fg"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {languages.map((code) => (
            <option key={code} value={code}>
              {languageName(code)}
            </option>
          ))}
        </select>
        <Note text={t("settings.language.help", { defaultValue: "" })} />
      </label>

      <fieldset className="flex flex-col gap-1" data-testid="theme-settings">
        <legend className="text-xs text-muted">{t("settings.theme")}</legend>
        <div className="flex gap-2">
          {THEMES.map((option) => (
            <label key={option} className="flex items-center gap-1 text-sm text-fg">
              <input
                type="radio"
                name="theme"
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              {t(`settings.theme.${option}`)}
            </label>
          ))}
        </div>
        <Note text={t("settings.theme.help", { defaultValue: "" })} />
      </fieldset>

      <fieldset className="flex flex-col gap-2" data-testid="scale-settings">
        <legend className="text-xs text-muted">{t("settings.text_size")}</legend>
        {/*
         * Auto is the default, as it is in the Paradox games this screen borrows from: the client
         * picks the largest scale its layout still fits the window at, and re-picks when the
         * window changes (playtest 5, L12). Moving the slider is how the player takes it back.
         */}
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            data-testid="ui-scale-auto"
            checked={uiScaleAuto}
            onChange={(event) => setUiScaleAuto(event.target.checked)}
          />
          {t("settings.ui_scale_auto")}
        </label>
        <Note text={t("settings.ui_scale_auto.help", { defaultValue: "" })} />
        <Slider
          label={t("settings.ui_scale")}
          min={Math.round(UI_SCALE_MIN * 100)}
          max={Math.round(UI_SCALE_MAX * 100)}
          step={Math.round(UI_SCALE_STEP * 100)}
          value={Math.round(uiScale * 100)}
          display={`${Math.round(uiScale * 100)}%`}
          commitMs={0}
          onChange={(value) => setUiScale(value / 100)}
        />
        <Note text={t("settings.ui_scale.help", { defaultValue: "" })} />
        <Slider
          label={t("settings.display_scale")}
          min={Math.round(DISPLAY_SCALE_MIN * 100)}
          max={Math.round(DISPLAY_SCALE_MAX * 100)}
          step={Math.round(UI_SCALE_STEP * 100)}
          value={Math.round(displayScale * 100)}
          display={`${Math.round(displayScale * 100)}%`}
          commitMs={0}
          onChange={(value) => setDisplayScale(value / 100)}
        />
        <Note text={t("settings.display_scale.help", { defaultValue: "" })} />
        {/*
         * The preview is live because it is the interface itself: both lines are ordinary
         * elements, so they are already scaled by the two variables the sliders write. A separate
         * rendering of the preview would be a second thing to keep in step with the first.
         */}
        <div data-testid="scale-preview" className="border border-line bg-panel2 px-2 py-1">
          <p className="prose text-fg">{t("settings.scale_preview")}</p>
          <p className="text-sm uppercase tracking-wide text-muted">
            {/* X12: the preview carries a size utility of its own, so the angular-face slider
              moves it. Without one it inherited the paragraph's size and the preview was the one
              angular label on the screen the setting did not reach. */}
            <span className="font-display text-sm">{t("settings.scale_preview_label")}</span>{" "}
            <span className="font-mono text-fg">1 234 CH/d</span>
          </p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1" data-testid="font-settings">
        <legend className="text-xs text-muted">{t("settings.font")}</legend>
        <div className="flex gap-2">
          {FONTS.map((option) => (
            <label key={option} className="flex items-center gap-1 text-sm text-fg">
              <input
                type="radio"
                name="font-face"
                checked={fontFace === option}
                onChange={() => setFontFace(option)}
              />
              {t(`settings.font.${option}`)}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">{t("settings.font.help")}</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2" data-testid="sound-settings">
        <legend className="text-xs text-muted">{t("settings.sound")}</legend>
        <VolumeRow
          label={t("settings.music_volume")}
          muteLabel={t("settings.mute")}
          volume={audio.music_volume}
          muted={audio.music_muted}
          onVolume={(music_volume) => setAudio({ music_volume })}
          onMute={(music_muted) => setAudio({ music_muted })}
        />
        <Note text={t("settings.music_volume.help", { defaultValue: "" })} />
        <VolumeRow
          label={t("settings.sfx_volume")}
          muteLabel={t("settings.mute")}
          volume={audio.sfx_volume}
          muted={audio.sfx_muted}
          onVolume={(sfx_volume) => setAudio({ sfx_volume })}
          onMute={(sfx_muted) => setAudio({ sfx_muted })}
        />
        <Note text={t("settings.sfx_volume.help", { defaultValue: "" })} />
        {/*
         * A checkout without the music pack is a normal checkout (`scripts/fetch-music.mjs` is not
         * run by `pnpm dev`), so the panel says there is nothing to play instead of leaving the
         * player to wonder why a slider does nothing.
         */}
        {music.ready && music.tracksAvailable === 0 ? (
          <p className="text-xs text-muted">{t("settings.music_missing")}</p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={crt} onChange={(event) => setCrt(event.target.checked)} />
          {t("settings.crt")}
        </label>
        <Note text={t("settings.crt.help", { defaultValue: "" })} />
      </div>
    </div>
  );
}
