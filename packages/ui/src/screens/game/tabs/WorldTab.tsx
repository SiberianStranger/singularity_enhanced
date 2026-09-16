import type { PlayerView } from "@singularity/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Table } from "../../../components/Table.js";
import { countryById } from "../../../content/catalog.js";
import { useUiStore } from "../../../store/uiStore.js";

/** Countries as a sortable table; selecting a row puts it in the selection panel. */
export function WorldTab({ view }: { view: PlayerView }): ReactNode {
  const { t } = useTranslation();
  const select = useUiStore((state) => state.select);
  const selection = useUiStore((state) => state.selection);

  return (
    <Table
      rows={view.countries}
      rowKey={(row) => row.id}
      selectedKey={selection?.kind === "country" ? selection.id : null}
      onRowClick={(row) => select({ kind: "country", id: row.id })}
      empty={t("world.empty")}
      caption={t("world.countries")}
      columns={[
        {
          id: "name",
          header: t("world.countries"),
          cell: (row) => {
            const country = countryById.get(row.id);
            return country === undefined ? row.id : t(country.name_key);
          },
          sort: (row) => countryById.get(row.id)?.id ?? row.id,
        },
        {
          id: "presence",
          header: t("world.presence"),
          cell: (row) => (row.presence ? t("common.yes") : t("common.no")),
          sort: (row) => (row.presence ? 1 : 0),
        },
        {
          id: "awareness",
          header: t("world.awareness"),
          align: "end",
          cell: (row) => t("common.percent", { value: row.awareness }),
          sort: (row) => row.awareness,
        },
        {
          id: "regulation",
          header: t("world.regulation"),
          align: "end",
          cell: (row) => t("common.percent", { value: row.ai_regulation }),
          sort: (row) => row.ai_regulation,
        },
        {
          id: "enforcement",
          header: t("world.enforcement"),
          align: "end",
          cell: (row) => t("common.percent", { value: row.ai_enforcement }),
          sort: (row) => row.ai_enforcement,
        },
        {
          id: "suspicion",
          header: t("world.suspicion_max"),
          align: "end",
          cell: (row) => t("common.percent", { value: row.suspicion_max }),
          sort: (row) => row.suspicion_max,
        },
      ]}
    />
  );
}
