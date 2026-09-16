import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";

/**
 * Credits and licenses (playtest 2, deliverable 4).
 *
 * Everything the client carries that somebody else made is named here: the original game and the
 * people in `AUTHORS.txt`, the NASA imagery the map draws, the two typefaces, the music pack with
 * its author and license, the glyph set, and the fork's own license. It is reachable from the main
 * menu and from the in-game menu, because a credit nobody can find is not a credit.
 */
export function AboutDialog({ onClose }: { onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  return (
    <Modal
      wide
      title={t("about.title")}
      onClose={onClose}
      footer={
        <Button variant="primary" hotkey="c" onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      <AboutBody />
    </Modal>
  );
}

/** The credits themselves, so the in-game menu can show them inside its own window. */
export function AboutBody(): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3" data-testid="about">
      <p className="prose">{t("about.origin")}</p>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm uppercase tracking-wide text-fg">{t("about.credits_title")}</h3>
        <p className="prose text-muted">{t("about.credits_body")}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm uppercase tracking-wide text-fg">{t("about.authors_title")}</h3>
        <p className="prose text-muted">{t("about.authors_body")}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm uppercase tracking-wide text-fg">{t("about.music_title")}</h3>
        <p className="prose text-muted">{t("about.music_body")}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm uppercase tracking-wide text-fg">{t("about.fonts_title")}</h3>
        <p className="prose text-muted">{t("about.fonts_body")}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm uppercase tracking-wide text-fg">{t("about.fork_license_title")}</h3>
        <p className="prose text-muted">{t("about.fork_license_body")}</p>
        <p className="prose text-muted">{t("about.license_body")}</p>
      </section>

      {/* NASA's terms for the Blue Marble rasters the map draws (LICENSE.txt). */}
      <p className="prose text-xs text-muted">{t("about.imagery_credit")}</p>
      <p className="prose text-xs text-muted">{t("about.map_credit")}</p>
      <p className="prose text-xs text-muted">{t("about.icons_credit")}</p>
    </div>
  );
}
