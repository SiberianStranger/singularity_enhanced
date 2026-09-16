import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Modal.js";

/** Credits for the original game and the license notice (README.txt, AUTHORS.txt). */
export function AboutDialog({ onClose }: { onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  return (
    <Modal
      title={t("about.title")}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p>{t("about.origin")}</p>
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t("about.credits_title")}</h3>
          <p className="text-muted">{t("about.credits_body")}</p>
        </section>
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t("about.license_title")}</h3>
          <p className="text-muted">{t("about.license_body")}</p>
        </section>
        <p className="text-xs text-muted">{t("about.map_credit")}</p>
        {/* NASA's terms for the Blue Marble rasters the map draws (LICENSE.txt). */}
        <p className="text-xs text-muted">{t("about.imagery_credit")}</p>
        <p className="text-xs text-muted">{t("about.font_credit")}</p>
      </div>
    </Modal>
  );
}
