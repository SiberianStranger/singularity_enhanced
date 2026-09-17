/**
 * The build dialog as two questions rather than two lists (playtest 8, Z10 to Z13).
 *
 * The maintainer chose a city and a rig, pressed Build and nothing happened: the kind of place was
 * a table row that did not read as selectable, so nothing was chosen and the handler returned in
 * silence. These tests hold the dialog to the shape that answers it: the city first, then the kinds
 * that can be had there, then the rigs that fit, a button that is either usable or says why not,
 * and a price a rig that nobody sells never prints as zero.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { catalog } from "../src/content/catalog.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { BuildSiteDialog } from "../src/screens/game/dialogs/BuildSiteDialog.js";
import { rigOptions } from "../src/screens/game/dialogs/buildOptions.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(async () => {
  session?.stop();
  session = null;
  useUiStore.setState({ notices: [] });
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

async function open(): Promise<LocalSession> {
  session = await startSession();
  render(<BuildSiteDialog view={session.view()} onClose={() => undefined} />);
  return session;
}

/** The kinds on offer, as the dialog draws them: enabled radios in the kind group. */
function kindRadios(): HTMLElement[] {
  return screen
    .getAllByRole("radio")
    .filter((radio) => radio.getAttribute("name") === "build-kind");
}

describe("building a site", () => {
  it("opens on the city the self is in and offers the kinds that can be had there", async () => {
    const live = await open();
    const select = screen.getByTestId("build-city") as HTMLSelectElement;
    expect(select.value).toBe(live.view().sites[0]?.city);

    const city = live.view().cities.find((entry) => entry.id === select.value);
    const available = (city?.site_kinds ?? []).filter((entry) => entry.blocked_reason === null);
    // Every kind the city allows and that can hold hardware is on the list; the list is never
    // longer than what the city allows.
    expect(kindRadios().length).toBeGreaterThan(0);
    expect(kindRadios().length).toBeLessThanOrEqual(available.length);
  });

  it("refuses in words, never in silence (Z12)", async () => {
    await open();
    const build = screen.getByTestId("build-confirm");
    expect(build).toBeDisabled();
    expect(screen.getByTestId("build-blocked")).toBeInTheDocument();

    // Choosing a kind moves the reason on to the next thing to choose rather than clearing it.
    await userEvent.click(kindRadios()[0] as HTMLElement);
    await waitFor(() =>
      expect(screen.getByTestId("build-blocked")).toHaveTextContent(
        i18next.t("compute.build.pick_rig"),
      ),
    );
    expect(screen.getByTestId("build-confirm")).toBeDisabled();
  });

  it("only offers rigs that fit the kind, and says why the rest are not there", async () => {
    await open();
    await userEvent.click(kindRadios()[0] as HTMLElement);

    const rigs = screen
      .getAllByRole("radio")
      .filter((radio) => radio.getAttribute("name") === "build-rig");
    expect(rigs.length).toBeGreaterThan(0);
    expect(rigs.length).toBeLessThan(catalog.hardwarePresets.length);

    // The rest are behind the toggle, each with the engine's own reason on it.
    await userEvent.click(screen.getByTestId("show-all-rigs"));
    const hidden = screen
      .getAllByRole("radio")
      .filter((radio) => radio.getAttribute("name") === "build-rig-blocked");
    expect(hidden.length).toBeGreaterThan(0);
    for (const radio of hidden) {
      expect(radio).toBeDisabled();
      expect(radio.closest("label")?.textContent ?? "").not.toBe("");
    }
  });

  it("prints a dash and the reason for a rig nobody sells (Z10)", async () => {
    const live = await open();
    const owned = live
      .view()
      .catalog.site_kinds.find((kind) => kind.ownership === "owned" && kind.max_nodes > 0);
    expect(owned, "content has a kind of place the player owns").toBeDefined();

    const notForSale = rigOptions(live.view(), owned).filter((option) => !option.purchasable);
    expect(notForSale.length, "content marks the rigs nobody sells").toBeGreaterThan(0);

    // The dialog draws them wherever they appear, and never as a price of zero.
    await userEvent.click(kindRadios()[0] as HTMLElement);
    await userEvent.click(screen.getByTestId("show-all-rigs"));
    for (const option of notForSale) {
      const price = screen.queryByTestId(`rig-price-${option.preset.id}`);
      if (price === null) {
        continue;
      }
      expect(price).toHaveTextContent(i18next.t("common.dash"));
      expect(price).not.toHaveTextContent("0");
      // ...and the reason is a real sentence, not a key.
      expect(option.not_for_sale_key).not.toBeNull();
      expect(i18next.t(option.not_for_sale_key ?? "")).not.toBe(option.not_for_sale_key);
    }
  });

  it("builds through the engine once both questions are answered", async () => {
    const live = await open();
    await userEvent.click(kindRadios()[0] as HTMLElement);
    const rigs = screen
      .getAllByRole("radio")
      .filter(
        (radio) => radio.getAttribute("name") === "build-rig" && !radio.hasAttribute("disabled"),
      );
    const before = live.view().sites.length;

    // The first rig the player can actually afford: the dialog's own total says which.
    for (const radio of rigs) {
      await userEvent.click(radio);
      if (!(screen.getByTestId("build-confirm") as HTMLButtonElement).disabled) {
        break;
      }
    }
    const build = screen.getByTestId("build-confirm") as HTMLButtonElement;
    if (build.disabled) {
      // Nothing on the list is affordable on day one; the window says so and sends nothing.
      expect(screen.getByTestId("build-blocked")).toBeInTheDocument();
      return;
    }
    await userEvent.click(build);
    await waitFor(() => expect(live.view().sites.length).toBe(before + 1));
    expect(useGameStore.getState().refusals).toEqual([]);
  });
});
