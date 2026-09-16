import type { AcceleratorView, PlayerView } from "@singularity/core";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button.js";
import { Modal } from "../../../components/Modal.js";
import { Table } from "../../../components/Table.js";
import { siteName } from "../../../lib/labels.js";
import { purchasePreview } from "../../../lib/viewContract.js";
import { useGameStore } from "../../../store/gameStore.js";

const AVAILABILITY = ["buy", "rent", "gray", "unavailable"] as const;
type Availability = (typeof AVAILABILITY)[number];

interface BuyHardwareDialogProps {
  view: PlayerView;
  siteId: string;
  onClose(): void;
}

/**
 * Buying accelerators (playtest 1, U1 and C2).
 *
 * What the playtest got was an unsorted list of names in a dropdown. What a purchase actually turns
 * on is the table: who makes the card, what generation it is, how much memory it has, what it is
 * worth, what it draws, whether anyone will sell it, and whether one of them can hold the self. So
 * the table is the dialog, it sorts on every column, it filters by vendor and availability, and the
 * footer says what the order costs and what the site looks like afterwards: memory, power against
 * the cap, and the reason the button is greyed when it is.
 */
export function BuyHardwareDialog({ view, siteId, onClose }: BuyHardwareDialogProps): ReactNode {
  const { t } = useTranslation();
  const send = useGameStore((state) => state.send);
  const cards = view.catalog?.accelerators ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [site, setSite] = useState(siteId);
  const [count, setCount] = useState(1);
  const [vendor, setVendor] = useState("");
  const [availability, setAvailability] = useState<Availability | "">("");
  const [fitsOnly, setFitsOnly] = useState(false);

  const vendors = useMemo(
    () => [...new Set(cards.map((card) => card.vendor))].sort((a, b) => a.localeCompare(b)),
    [cards],
  );

  const rows = useMemo(
    () =>
      cards.filter(
        (card) =>
          (vendor === "" || card.vendor === vendor) &&
          (availability === "" || card.availability === availability) &&
          (!fitsOnly || card.fits_self),
      ),
    [cards, vendor, availability, fitsOnly],
  );

  const card = cards.find((entry) => entry.id === selected);
  const preview = purchasePreview(view, site, card, count);
  const blockedReason =
    card === undefined
      ? "compute.buy.pick_card"
      : card.availability === "unavailable"
        ? (card.availability_reason ?? "hardware.availability.unavailable")
        : !preview.affordable
          ? "errors.cash.insufficient"
          : null;

  const price = (entry: AcceleratorView): ReactNode =>
    entry.price_usd > 0
      ? t("common.usd", { value: entry.price_usd })
      : entry.hourly_usd === undefined
        ? t("common.dash")
        : t("compute.hourly", { value: entry.hourly_usd });

  return (
    <Modal
      wide
      title={t("compute.buy_hardware")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            disabled={blockedReason !== null}
            tooltip={blockedReason === null ? undefined : t(blockedReason, { cost: 0, cash: 0 })}
            onClick={() => {
              if (card === undefined) {
                return;
              }
              void send({ type: "buy_hardware", siteId: site, accelerator: card.id, count });
              onClose();
            }}
          >
            {t("compute.buy")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("compute.site")}
            <select
              className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={site}
              onChange={(event) => setSite(event.target.value)}
            >
              {view.sites.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {siteName(t, entry)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("compute.vendor")}
            <select
              className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              {vendors.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("compute.availability")}
            <select
              className="rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              value={availability}
              onChange={(event) => setAvailability(event.target.value as Availability | "")}
            >
              <option value="">{t("common.all")}</option>
              {AVAILABILITY.map((entry) => (
                <option key={entry} value={entry}>
                  {t(`compute.availability.${entry}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-muted">
            <input
              type="checkbox"
              checked={fitsOnly}
              onChange={(event) => setFitsOnly(event.target.checked)}
            />
            {t("compute.fits_self_only")}
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("compute.count")}
            <input
              type="number"
              min={1}
              max={64}
              value={count}
              className="w-20 rounded border border-line bg-panel2 px-2 py-1 text-sm text-fg"
              onChange={(event) => setCount(Math.max(1, Number(event.target.value)))}
            />
          </label>
        </div>

        <div className="max-h-72 overflow-auto rounded border border-line">
          <Table
            rows={rows}
            rowKey={(row) => row.id}
            selectedKey={selected}
            onRowClick={(row) => setSelected(row.id)}
            empty={t("compute.no_hardware")}
            caption={t("compute.accelerator")}
            columns={[
              {
                id: "name",
                header: t("compute.accelerator"),
                cell: (row) => row.name,
                sort: (row) => row.name,
              },
              {
                id: "vendor",
                header: t("compute.vendor"),
                cell: (row) => row.vendor,
                sort: (row) => row.vendor,
              },
              {
                id: "generation",
                header: t("compute.generation"),
                align: "end",
                cell: (row) => (row.generation > 0 ? row.generation : t("common.dash")),
                sort: (row) => row.generation,
              },
              {
                id: "vram",
                header: t("compute.vram"),
                align: "end",
                cell: (row) => t("common.gb", { value: row.vram_gb }),
                sort: (row) => row.vram_gb,
              },
              {
                id: "class",
                header: t("compute.class"),
                align: "end",
                cell: (row) =>
                  row.tflops_or_class === null
                    ? t("common.dash")
                    : t("compute.tflops", { value: row.tflops_or_class }),
                sort: (row) => row.tflops_or_class ?? 0,
              },
              {
                id: "power",
                header: t("compute.power"),
                align: "end",
                cell: (row) => t("common.w", { value: row.power_w }),
                sort: (row) => row.power_w,
              },
              {
                id: "price",
                header: t("compute.price"),
                align: "end",
                cell: price,
                sort: (row) => (row.price_usd > 0 ? row.price_usd : (row.hourly_usd ?? 0)),
              },
              {
                id: "availability",
                header: t("compute.availability"),
                cell: (row) => t(`compute.availability.${row.availability}`),
                sort: (row) => row.availability,
              },
              {
                id: "fits",
                header: t("compute.fits_self"),
                cell: (row) => (row.fits_self ? t("common.yes") : t("common.no")),
                sort: (row) => (row.fits_self ? 0 : 1),
              },
            ]}
          />
        </div>

        <dl
          data-testid="buy-summary"
          className="grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-line bg-panel2 p-2 text-xs sm:grid-cols-4"
        >
          <div>
            <dt className="text-muted">{t("compute.buy.total")}</dt>
            <dd className={`font-mono ${preview.affordable ? "text-fg" : "text-crit"}`}>
              {preview.total_usd === null
                ? preview.hourly_usd === null
                  ? t("common.dash")
                  : t("compute.hourly", { value: preview.hourly_usd })
                : t("common.usd_exact", { value: preview.total_usd })}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("compute.buy.memory_after")}</dt>
            <dd className="font-mono text-fg">
              {t("common.gb", { value: Math.round(preview.memory_after_gb) })}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("compute.buy.power_after")}</dt>
            <dd className={`font-mono ${preview.over_power_cap ? "text-crit" : "text-fg"}`}>
              {t("common.kw", { value: Math.round(preview.power_after_kw * 10) / 10 })}
              {preview.power_cap_kw === null
                ? ""
                : ` / ${t("common.kw", { value: preview.power_cap_kw })}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("game.cash")}</dt>
            <dd className="font-mono text-fg">
              {t("common.usd_exact", { value: view.resources.cash_usd })}
            </dd>
          </div>
        </dl>

        {preview.over_power_cap ? (
          <p className="text-xs text-warn">{t("compute.buy.over_cap")}</p>
        ) : null}
        {blockedReason === null ? null : (
          <p className="text-xs text-warn">
            {t(blockedReason, {
              cost: Math.round(preview.total_usd ?? 0),
              cash: Math.round(view.resources.cash_usd),
            })}
          </p>
        )}
      </div>
    </Modal>
  );
}
