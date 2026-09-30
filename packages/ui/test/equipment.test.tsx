import {
  EQUIPMENT_SLOTS,
  type EquipmentOfferView,
  type PlayerView,
  type SiteEquipmentView,
  type SiteView,
} from "@singularity/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentDialog } from "../src/screens/game/dialogs/EquipmentDialog.js";
import { SiteEquipmentPanel } from "../src/screens/game/tabs/SiteEquipmentPanel.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;
const originalSend = useGameStore.getState().send;

beforeEach(async () => {
  await i18next.changeLanguage("en");
  i18next.addResourceBundle("en", "translation", {
    "equipment_test.retired": "Retired server accelerator",
    "equipment_test.custom": "Custom tensor module",
    "equipment_test.desc": "Room for a copy on an obtainable server configuration.",
    "equipment_test.tradeoff": "The cooling remains audible.",
    "equipment_test.standard": "Established ecosystem",
    "equipment_test.alternative": "Alternative ecosystem",
    "equipment_test.research": "Tensor module design",
  });
});

afterEach(async () => {
  session?.stop();
  session = null;
  useGameStore.setState({ send: originalSend });
  useUiStore.setState({ primaryTab: "overview", focusId: null, notices: [] });
  await i18next.changeLanguage("en");
});

function offer(id: string, overrides: Partial<EquipmentOfferView> = {}): EquipmentOfferView {
  return {
    id,
    slot: "compute",
    archetype: "retired",
    name_key: "equipment_test.retired",
    desc_key: "equipment_test.desc",
    tradeoff_key: "equipment_test.tradeoff",
    variant_key: "equipment_test.standard",
    basis: ["NVIDIA Tesla P40"],
    stage: 0,
    requires: [],
    blocked_reason: null,
    cost_usd: 800,
    upkeep_usd_per_day: 3,
    days: 4,
    prototype: false,
    preview: {
      memory_gb: 96,
      power_kw: 1.2,
      power_capacity_kw: 3,
      cooling_capacity_kw: 2,
      compute_before: 15,
      compute_after: 25,
      fits_self: true,
    },
    ...overrides,
  };
}

async function fixture(): Promise<PlayerView> {
  session = await startSession();
  const view = session.view();
  const equipment: SiteEquipmentView = {
    slots: EQUIPMENT_SLOTS.map((id) => ({
      id,
      installed_key: "equipment_ui.existing",
      managed: id === "network",
    })),
    offers: [
      offer("used-established"),
      offer("used-alternative", {
        variant_key: "equipment_test.alternative",
        basis: ["AMD Instinct MI50"],
      }),
      offer("custom", {
        archetype: "custom",
        name_key: "equipment_test.custom",
        prototype: true,
        requires: [{ id: "tensor_design", name_key: "equipment_test.research", done: false }],
        blocked_reason: { key: "equipment_ui.needed" },
      }),
    ],
    orders: [
      {
        id: "order-1",
        name_key: "equipment_test.custom",
        slot: "compute",
        phase: "prototype",
        remaining_days: 2.5,
      },
    ],
    power_capacity_kw: 3,
    cooling_capacity_kw: 2,
    network_mbps: 100,
    network_egress: true,
    interconnect_tier: 1,
  };
  return {
    ...view,
    sites: view.sites.map((site, index) => (index === 0 ? { ...site, equipment } : site)),
  };
}

describe("site equipment", () => {
  it("groups offers into singular archetypes and submits the selected variant", async () => {
    const view = await fixture();
    const send = vi.fn().mockResolvedValue({ ok: true });
    const close = vi.fn();
    useGameStore.setState({ send });
    render(<EquipmentDialog view={view} siteId={view.sites[0]?.id ?? ""} onClose={close} />);

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByTestId("equipment-confirm")).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: /Retired server accelerator/ }));
    const variants = screen.getByRole("group", { name: "Configuration variants" });
    expect(within(variants).getAllByRole("button")).toHaveLength(2);
    await userEvent.click(within(variants).getByRole("button", { name: "Alternative ecosystem" }));
    expect(screen.getByTestId("equipment-preview")).toHaveTextContent("96 GB");
    expect(screen.getByTestId("equipment-preview")).toHaveTextContent("25 CH/day");
    await userEvent.click(screen.getByText("Hardware and technical basis"));
    expect(screen.getByText("AMD Instinct MI50")).toBeVisible();
    await userEvent.click(screen.getByTestId("equipment-confirm"));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(send).toHaveBeenCalledExactlyOnceWith({
      type: "order_equipment",
      siteId: view.sites[0]?.id,
      equipmentId: "used-alternative",
    });
  });

  it("keeps an engine refusal beside the selected configuration", async () => {
    const view = await fixture();
    const close = vi.fn();
    useGameStore.setState({
      send: vi.fn().mockResolvedValue({
        ok: false,
        error: { key: "errors.cash.insufficient", vars: { cost: 800, cash: 100 } },
      }),
    });
    render(<EquipmentDialog view={view} siteId={view.sites[0]?.id ?? ""} onClose={close} />);
    await userEvent.click(screen.getByRole("radio", { name: /Retired server accelerator/ }));
    await userEvent.click(screen.getByTestId("equipment-confirm"));
    expect(await screen.findByTestId("equipment-refused")).toHaveTextContent("800");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /Retired server accelerator/ })).toBeChecked();
  });

  it("explains a known next configuration and opens its required research", async () => {
    const view = await fixture();
    const close = vi.fn();
    render(<EquipmentDialog view={view} siteId={view.sites[0]?.id ?? ""} onClose={close} />);
    await userEvent.click(screen.getByRole("radio", { name: /Custom tensor module/ }));
    expect(screen.getByTestId("equipment-confirm")).toBeDisabled();
    expect(screen.getByTestId("equipment-blocked")).toHaveTextContent("needed");
    await userEvent.click(screen.getByRole("button", { name: "Tensor module design: needed" }));
    expect(useUiStore.getState().primaryTab).toBe("research");
    expect(useUiStore.getState().focusId).toBe("tensor_design");
    expect(close).toHaveBeenCalledOnce();
  });

  it("shows exactly six subsystems, host control and the real order phase", async () => {
    const view = await fixture();
    const site = view.sites[0];
    expect(site).toBeDefined();
    if (site === undefined) {
      return;
    }
    render(<SiteEquipmentPanel view={view} site={site} />);
    expect(screen.getAllByTestId(/^equipment-slot-/)).toHaveLength(6);
    expect(
      within(screen.getByTestId("equipment-slot-network")).getByText("Managed by the host"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("equipment-orders")).toHaveTextContent(
      "Prototype; 2.5 days remaining",
    );
    await userEvent.click(screen.getByRole("button", { name: "View Cooling options" }));
    expect(screen.getByRole("combobox", { name: "Subsystem" })).toHaveValue("cooling");
    expect(
      screen.getByText("No new configuration is known for this subsystem here yet."),
    ).toBeInTheDocument();
  });

  it("says once, beside the heading, that the host runs every subsystem", async () => {
    const view = await fixture();
    const site = view.sites[0];
    const equipment = site?.equipment;
    expect(equipment).toBeDefined();
    if (site === undefined || equipment === undefined) {
      return;
    }
    const hosted: SiteView = {
      ...site,
      equipment: {
        ...equipment,
        slots: equipment.slots.map((entry) => ({ ...entry, managed: true })),
      },
    };
    render(<SiteEquipmentPanel view={view} site={hosted} />);
    expect(screen.getAllByText("Managed by the host")).toHaveLength(1);
    expect(screen.getByTestId("equipment-managed-all")).toHaveTextContent("Managed by the host");
    for (const row of screen.getAllByTestId(/^equipment-slot-/)) {
      expect(within(row).queryByText("Managed by the host")).toBeNull();
      // Each row still offers a look at what the host allows, rather than a change.
      expect(within(row).getByRole("button")).toHaveTextContent("Inspect");
    }
  });
});
