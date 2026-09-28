import type { EquipmentOfferView, PlayerView } from "@singularity/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { type ReactNode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { EquipmentDialog } from "../src/screens/game/dialogs/EquipmentDialog.js";
import { ResearchDoneWindow } from "../src/screens/game/ResearchDone.js";
import { ResearchTab } from "../src/screens/game/tabs/ResearchTab.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
const scroll = vi.fn();

beforeEach(async () => {
  await i18next.changeLanguage("en");
  useUiStore.setState({ primaryTab: "compute", focusId: null });
  scroll.mockReset();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scroll,
  });
});

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ primaryTab: "overview", focusId: null, notices: [] });
  if (originalScroll === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  } else {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll);
  }
});

/** Exercise the actual dialog navigation and the destination panel in the same mounted tree. */
function RequirementNavigation({ view }: { view: PlayerView }): ReactNode {
  const primary = useUiStore((state) => state.primaryTab);
  const [open, setOpen] = useState(true);
  return (
    <>
      {primary === "research" ? <ResearchTab view={view} /> : null}
      {open ? (
        <EquipmentDialog
          view={view}
          siteId={view.sites[0]?.id ?? ""}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

describe("equipment links into research", () => {
  it("opens a locked requirement, reveals its row and moves keyboard focus to it", async () => {
    session = await startSession();
    const view = session.view();
    const target = view.research.techs.find((tech) => tech.status === "locked");
    const site = view.sites[0];
    const first = site?.equipment?.offers[0];
    expect(target).toBeDefined();
    expect(first).toBeDefined();
    if (target === undefined || site?.equipment === undefined || first === undefined) {
      throw new Error("The shipped content must provide a locked technology and equipment");
    }
    const offer: EquipmentOfferView = {
      ...first,
      requires: [{ id: target.id, name_key: target.name_key, done: false }],
      blocked_reason: { key: "equipment.error.research", vars: { tech: target.name_key } },
    };
    const linkedView = {
      ...view,
      sites: [{ ...site, equipment: { ...site.equipment, offers: [offer] } }],
    };
    render(<RequirementNavigation view={linkedView} />);
    await userEvent.click(screen.getByRole("radio"));
    await userEvent.click(
      screen.getByRole("button", {
        name: i18next.t("equipment_ui.requirement", {
          name: i18next.t(target.name_key),
          state: i18next.t("equipment_ui.needed"),
        }),
      }),
    );
    const row = await screen.findByTestId(`tech-${target.id}`);
    expect(row).toBeVisible();
    expect(row).toHaveTextContent(i18next.t(target.name_key));
    expect(screen.getByRole("button", { name: /^Locked$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() => expect(row).toHaveFocus());
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
    expect(screen.queryByTestId("equipment-dialog")).not.toBeInTheDocument();
    // Following a link must not permanently defeat manual filters.
    await userEvent.click(screen.getByRole("button", { name: /^Locked$/ }));
    expect(screen.queryByTestId(`tech-${target.id}`)).not.toBeInTheDocument();
  }, 30_000);

  it("shows an equipment archetype once when research unlocks two real variants", async () => {
    session = await startSession();
    const view = session.view();
    const technology = view.research.techs.find((tech) => tech.id === "corporate_identities");
    const variants = (contentBundle.equipment ?? []).filter(
      (entry) => entry.archetype === "enterprise_server",
    );
    expect(variants).toHaveLength(2);
    expect(technology).toBeDefined();
    if (technology === undefined || variants[0] === undefined) {
      throw new Error("The shipped content must include the enterprise equipment unlock");
    }
    for (const variant of variants) {
      expect(technology.unlocks).toContain(`equipment:${variant.id}`);
    }
    useUiStore.setState({ focusId: technology.id, primaryTab: "research" });
    render(<ResearchTab view={view} />);
    const row = await screen.findByTestId(`tech-${technology.id}`);
    const name = i18next.t(variants[0].name_key);
    expect((row.textContent ?? "").split(name)).toHaveLength(2);
  });

  it("deduplicates the completion window and reveals its completed research destination", async () => {
    session = await startSession();
    const source = session.view();
    const target = source.research.techs.find((tech) => tech.id === "corporate_identities");
    const variants = (contentBundle.equipment ?? []).filter(
      (entry) => entry.archetype === "enterprise_server",
    );
    expect(target).toBeDefined();
    expect(variants).toHaveLength(2);
    if (target === undefined || variants[0] === undefined) {
      throw new Error("Missing research fixture");
    }
    const view: PlayerView = {
      ...source,
      research: {
        ...source.research,
        techs: source.research.techs.map((tech) =>
          tech.id === target.id ? { ...tech, status: "done", progress: 1 } : tech,
        ),
      },
    };
    function CompletionNavigation(): ReactNode {
      const primary = useUiStore((state) => state.primaryTab);
      const [open, setOpen] = useState(true);
      return (
        <>
          {primary === "research" ? <ResearchTab view={view} /> : null}
          {open ? (
            <ResearchDoneWindow
              finished={{
                id: "completed-equipment-research",
                tech_id: target?.id ?? "",
                name_key: target?.name_key ?? "",
                result_key: "",
                unlocks: variants.map((variant) => `equipment:${variant.id}`),
              }}
              queued={0}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }
    render(<CompletionNavigation />);
    const unlocks = screen.getByTestId("research-done-unlocks");
    expect(within(unlocks).getAllByRole("listitem")).toHaveLength(1);
    expect(unlocks).toHaveTextContent(i18next.t(variants[0].name_key));
    await userEvent.click(
      screen.getByRole("button", { name: i18next.t("research.done_window.open_tab") }),
    );
    const row = await screen.findByTestId(`tech-${target.id}`);
    expect(row).toBeVisible();
    expect(screen.getByRole("button", { name: /^Done$/ })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(row).toHaveFocus());
    expect(screen.queryByTestId("research-done")).not.toBeInTheDocument();
  });
});
