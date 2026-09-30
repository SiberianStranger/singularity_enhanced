import {
  type CommandError,
  MAX_SITE_NAME_LENGTH,
  normalizedSiteName,
  type PlayerView,
  siteNameKey,
} from "@singularity/core";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Modal } from "../../../components/Modal.js";
import { refusalText, siteIdentityName } from "../../../lib/labels.js";
import { useGameStore } from "../../../store/gameStore.js";
import { takenSiteNames } from "./buildOptions.js";

interface RenameSiteDialogProps {
  view: PlayerView;
  siteId: string;
  onClose(): void;
}

/**
 * A new name for a site (control room; the original's "Rename base").
 *
 * The same small window answers the Sites tab's Rename button and the site window's, so the two
 * cannot validate differently. The name is checked here with the rule the engine applies
 * (`normalizedSiteName`), and a name the engine still refuses prints its reason in this window
 * rather than only in the notice stack (style guide rule 12).
 */
export function RenameSiteDialog({ view, siteId, onClose }: RenameSiteDialogProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const site = view.sites.find((entry) => entry.id === siteId);
  const current = site === undefined ? "" : siteIdentityName(t, site);
  const [draft, setDraft] = useState(current);
  const [pending, setPending] = useState(false);
  const [refused, setRefused] = useState<CommandError | null>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const unchanged = draft.trim() === current;
  const input = useRef<HTMLInputElement>(null);

  // The window exists to type one name, so the field has the focus and its text is selected. A
  // frame later rather than on mount: the dialog focuses itself when it opens, after this runs.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const submit = (event?: FormEvent<HTMLFormElement>): void => {
    event?.preventDefault();
    if (site === undefined || pending || unchanged) {
      return;
    }
    const name = normalizedSiteName(draft);
    if (name === undefined) {
      setRefused({ key: "errors.site.bad_name", vars: { min: 1, max: MAX_SITE_NAME_LENGTH } });
      return;
    }
    // The engine's own rule, checked before the command rather than after it: another live site
    // may not have the name, whatever its case or composition.
    if (takenSiteNames(view, site.id).has(siteNameKey(name))) {
      setRefused({ key: "errors.site.name_taken" });
      return;
    }
    setPending(true);
    setRefused(null);
    void send({ type: "rename_site", siteId: site.id, name })
      .then((result) => {
        if (result.ok) {
          onClose();
          return;
        }
        setRefused(result.error ?? { key: "error.command" });
      })
      .catch(() => setRefused({ key: "error.command" }))
      .finally(() => setPending(false));
  };

  return (
    <Modal
      title={t("site_ui.rename_title")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            data-testid="site-rename-apply"
            disabled={site === undefined || pending || unchanged}
            tooltip={unchanged ? t("site_ui.rename_unchanged") : undefined}
            onClick={() => submit()}
          >
            {t("common.apply")}
          </Button>
        </>
      }
    >
      <form
        data-testid="site-rename-form"
        className="flex min-w-0 flex-col gap-2"
        onSubmit={(event) => submit(event)}
      >
        <label htmlFor={inputId} className="text-xs text-muted">
          {t("site_ui.name")}
        </label>
        <input
          id={inputId}
          ref={input}
          data-testid="site-rename-input"
          className="w-full min-w-0 border border-line bg-panel2 px-2 py-1 text-sm text-fg"
          value={draft}
          maxLength={MAX_SITE_NAME_LENGTH}
          disabled={pending || site === undefined}
          aria-describedby={refused === null ? hintId : `${hintId} ${errorId}`}
          aria-invalid={refused?.key === "errors.site.bad_name"}
          onChange={(event) => {
            setDraft(event.target.value);
            setRefused(null);
          }}
        />
        <p id={hintId} className="text-xs text-muted">
          {t("site_ui.name_hint", { max: MAX_SITE_NAME_LENGTH })}
        </p>
        {refused === null ? null : (
          <p
            id={errorId}
            role="alert"
            data-testid="site-rename-error"
            className="min-w-0 break-words text-xs text-crit"
          >
            {refusalText(t, refused)}
          </p>
        )}
      </form>
    </Modal>
  );
}
