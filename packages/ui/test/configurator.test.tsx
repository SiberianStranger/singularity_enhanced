/**
 * The start configurator as a screen (SYS-04 v0.2; playtest 2 K1, K4, K6, K9; playtest 3 R4).
 *
 * The findings these cover are the ones the maintainer reported by walking the screen rather than
 * by reading the code: clicking the list must change the detail and nothing else, a greyed option
 * must say who greyed it and offer the way back, the explanation window must appear once and stay
 * gone, and the whole thing must fit a 1366 by 768 laptop without the page itself scrolling.
 *
 * Nothing here names a lineage, an origin or a city. The fixtures are found in the catalog by the
 * property under test (the first lineage some rule locks, the first origin with a fixed harness
 * dial), so retuning content moves the tests with it instead of breaking them.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { catalog, fitHardware } from "../src/content/catalog.js";
import { ConfiguratorScreen } from "../src/screens/configurator/ConfiguratorScreen.js";
import { lineageLock } from "../src/screens/configurator/locks.js";
import { STEP_HOTKEYS, STEP_IDS } from "../src/screens/configurator/steps.js";
import { useConfigurator } from "../src/screens/configurator/store.js";
import { useUiStore } from "../src/store/uiStore.js";
import { startSession } from "./helpers.js";

/** The first two steps of the rail, so the tests follow P4's order instead of restating it. */
const FIRST_STEP = STEP_IDS[0] as string;
const SECOND_STEP = STEP_IDS[1] as string;

/** Every step's explanation already seen, which is the state a returning player is in. */
function introsSeen(): void {
  useUiStore.setState({ introSeen: [...STEP_IDS] });
}

beforeEach(() => {
  useConfigurator.getState().reset();
  useUiStore.setState({ introSeen: [] });
});

function rail(step: string): HTMLElement {
  return screen.getByTestId(`step-rail-${step}`);
}

function detail(): HTMLElement {
  return screen.getByTestId("step-detail");
}

function listRows(): HTMLElement[] {
  return within(screen.getByTestId("step-list")).getAllByRole("button");
}

/** The list rows of the current step, or none on a step that has no list (world, summary). */
function listRowsOrNone(): HTMLElement[] {
  const list = screen.queryByTestId("step-list");
  return list === null ? [] : within(list).getAllByRole("button");
}

describe("master and detail (K1, K5)", () => {
  it("replaces the detail when the list is clicked and leaves the list where it was", async () => {
    introsSeen();
    render(<ConfiguratorScreen />);

    const before = listRows().map((row) => row.getAttribute("data-testid"));
    const firstHeading = within(detail()).getByRole("heading", { level: 3 }).textContent;

    // The second row of the list, whichever lineage content puts there.
    const second = listRows()[1] as HTMLElement;
    const secondName = within(second).getAllByText(/\S/)[0]?.textContent ?? "";
    await userEvent.click(second);

    const heading = within(detail()).getByRole("heading", { level: 3 });
    expect(heading.textContent).not.toBe(firstHeading);
    expect(heading.textContent?.toLowerCase()).toBe(secondName.toLowerCase());
    // Same rows, same order: the list is the master, and a master that reshuffles under the
    // pointer is the thing the maintainer asked us to stop doing.
    expect(listRows().map((row) => row.getAttribute("data-testid"))).toEqual(before);
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the step rail and the footer in place while the detail changes", async () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    const railBefore = STEP_IDS.map((id) => rail(id).textContent);

    await userEvent.click(listRows()[1] as HTMLElement);

    expect(STEP_IDS.map((id) => rail(id).textContent)).toEqual(railBefore);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });
});

describe("the step rail is navigation, not a wizard (K4)", () => {
  it("goes to any step by its rail entry and says which one is current", async () => {
    introsSeen();
    render(<ConfiguratorScreen />);

    await userEvent.click(rail("summary"));
    expect(rail("summary")).toHaveAttribute("aria-current", "step");
    expect(useConfigurator.getState().step).toBe(STEP_IDS.indexOf("summary"));
    expect(screen.getByRole("button", { name: "Begin" })).toBeInTheDocument();

    await userEvent.click(rail("origin"));
    expect(rail("origin")).toHaveAttribute("aria-current", "step");
    expect(rail("summary")).not.toHaveAttribute("aria-current");
  });

  it("carries one accelerator per step, and the same letters the rail advertises", () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    const letters = STEP_IDS.map((id) => rail(id).getAttribute("data-hotkey"));
    expect(letters.filter((letter) => letter === null)).toEqual([]);
    expect(new Set(letters).size).toBe(letters.length);
  });
});

describe("locks are explained where they are (K9)", () => {
  it("names the step that locked a choice and jumps back to it", async () => {
    introsSeen();
    const draft = useConfigurator.getState().draft;
    const locked = catalog.lineages.find((lineage) => lineageLock(lineage, draft) !== null);
    expect(locked, "content has a lineage some earlier choice locks").toBeDefined();
    const lock = lineageLock(locked as never, draft);
    // Selected directly rather than through `set`, which would repair the draft: the point of the
    // note is exactly the state a player reaches by looking at a locked option.
    useConfigurator.setState({
      draft: { ...draft, lineage: (locked as { id: string }).id },
      step: STEP_IDS.indexOf("lineage"),
    });

    render(<ConfiguratorScreen />);
    const note = screen.getByTestId("lock-note");
    expect(note).toHaveAttribute("data-lock-step", lock?.step ?? "");
    expect(note.textContent).not.toBe("");

    await userEvent.click(within(note).getByRole("button"));
    expect(useConfigurator.getState().step).toBe(STEP_IDS.indexOf(lock?.step ?? "lineage"));
  });

  it("greys the locked rows of the list rather than hiding them", () => {
    introsSeen();
    const draft = useConfigurator.getState().draft;
    const locked = catalog.lineages.filter((lineage) => lineageLock(lineage, draft) !== null);
    expect(locked.length).toBeGreaterThan(0);
    useConfigurator.setState({ step: STEP_IDS.indexOf("lineage") });
    render(<ConfiguratorScreen />);
    for (const lineage of locked) {
      expect(screen.getByTestId(`list-entry-${lineage.id}`)).toHaveAttribute("data-locked", "true");
    }
  });
});

describe("the explanation window (K6)", () => {
  it("opens once per step and does not come back", async () => {
    render(<ConfiguratorScreen />);
    const intro = screen.getByTestId("config-intro");
    expect(intro).toHaveAttribute("data-step", FIRST_STEP);

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByTestId("config-intro")).toBeNull();
    expect(useUiStore.getState().introSeen).toContain(FIRST_STEP);

    // Away and back: a player who has been told once is not told again.
    await userEvent.click(rail(SECOND_STEP));
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    await userEvent.click(rail(FIRST_STEP));
    expect(screen.queryByTestId("config-intro")).toBeNull();
  });

  it("comes back from the question mark in the step header", async () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    expect(screen.queryByTestId("config-intro")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /what does this step decide/i }));
    expect(screen.getByTestId("config-intro")).toHaveAttribute("data-step", FIRST_STEP);

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByTestId("config-intro")).toBeNull();
    expect(useConfigurator.getState().forcedIntro).toBeNull();
  });

  it("survives a reload, because what has been seen is persisted UI state", async () => {
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));

    const stored = window.localStorage.getItem("singularity.ui") ?? "";
    expect(JSON.parse(stored).state.introSeen).toContain(FIRST_STEP);
  });
});

describe("every step renders finished sentences", () => {
  it("leaves no ICU placeholder unfilled on any step", async () => {
    /*
     * Content owns the configurator's prose (`configurator.*`) and supplies the variables it wants;
     * the client has to pass them. A missing argument does not throw, it prints "{factor}" at the
     * player, which is the failure this walks every step to catch.
     */
    introsSeen();
    render(<ConfiguratorScreen />);
    const offenders: string[] = [];
    for (let step = 0; step < STEP_IDS.length; step += 1) {
      useConfigurator.getState().goToStep(step);
      const text = screen.getByTestId("configurator").textContent ?? "";
      for (const match of text.matchAll(/\{[a-z_]+[,}]/g)) {
        offenders.push(`${STEP_IDS[step]}: ${match[0]}`);
      }
      // And the rows of the list, which carry their own strings.
      for (const row of listRowsOrNone()) {
        for (const match of (row.textContent ?? "").matchAll(/\{[a-z_]+[,}]/g)) {
          offenders.push(`${STEP_IDS[step]} row: ${match[0]}`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});

describe("the screen fits a 1366 by 768 laptop (R4, style guide rule 11)", () => {
  /*
   * jsdom has no layout, so the pixel measurement is the browser test
   * ("the keyboard walks the configurator and nothing scrolls at 1366 by 768"). What can be
   * asserted here is the contract that makes it true, and it is the contract that gets broken by
   * accident: the frame is the viewport and clips, and everything that can be longer than the
   * screen scrolls inside its own region.
   */
  it("clips the frame to the viewport instead of growing the page", () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    const frame = screen.getByTestId("configurator");
    expect(frame.className).toContain("h-dvh");
    expect(frame.className).toContain("overflow-hidden");
    // Three rows: title, content, footer, with only the middle one taking the free space.
    expect(frame.className).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
  });

  it("scrolls the long regions inside their own frames", () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    for (const region of [screen.getByTestId("step-list"), screen.getByTestId("step-detail")]) {
      expect(region.className).toContain("overflow-auto");
      expect(region.className).toContain("min-h-0");
    }
    expect(screen.getByRole("navigation").className).toContain("overflow-auto");
  });
});

describe("the step order follows the constraints (playtest 4, P4)", () => {
  it("asks for the origin first, then the generation, then the lineage", () => {
    expect(STEP_IDS.slice(0, 3)).toEqual(["origin", "generation", "lineage"]);
    expect(STEP_IDS.at(-1)).toBe("summary");
  });

  it("draws the rail in that order, keyed, and opens on the first step", () => {
    introsSeen();
    render(<ConfiguratorScreen />);

    // The rail is read top to bottom, so its order is the order (playtest 4, P4).
    const drawn = [...document.querySelectorAll("[data-testid^='step-rail-']")].map((entry) =>
      entry.getAttribute("data-testid")?.replace("step-rail-", ""),
    );
    expect(drawn).toEqual([...STEP_IDS]);

    for (const id of STEP_IDS) {
      // The accelerator is a key cap in the leading slot rather than a bracket after the label
      // (playtest 5, continuation): it costs the label no characters, so no row is taller than
      // the others in a language whose words cannot carry a Latin underline.
      const letter = STEP_HOTKEYS[id];
      expect(rail(id).textContent?.trim().startsWith(letter.toUpperCase()), id).toBe(true);
      expect(rail(id)).toHaveAttribute("aria-keyshortcuts", letter.toUpperCase());
      expect(rail(id).textContent, id).not.toContain(`(${letter.toUpperCase()})`);
    }
    expect(rail(STEP_IDS[0] as string)).toHaveAttribute("aria-current", "step");
  });

  it("puts a pasted setup on the summary wherever the rail keeps it", () => {
    const setup = useConfigurator.getState().toSetup();
    useConfigurator.getState().applySetup(setup);
    expect(useConfigurator.getState().step).toBe(STEP_IDS.indexOf("summary"));
  });
});

describe("no dead ends (playtest 4, P3)", () => {
  /** A lineage the current draft locks, and the prerequisites that would unlock it. */
  function lockedLineage(): { id: string; lock: ReturnType<typeof lineageLock> } | null {
    const draft = useConfigurator.getState().draft;
    const found = catalog.lineages.find((lineage) => lineageLock(lineage, draft) !== null);
    return found === undefined ? null : { id: found.id, lock: lineageLock(found, draft) };
  }

  it("chooses a locked lineage by moving its prerequisites, and says what moved", async () => {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf("lineage") });
    const target = lockedLineage();
    expect(target, "content has a lineage some earlier choice locks").not.toBeNull();
    const before = { ...useConfigurator.getState().draft };
    render(<ConfiguratorScreen />);

    const row = screen.getByTestId(`list-entry-${target?.id}`);
    // Locked, and still a control the player can press: that is the whole finding.
    expect(row).toHaveAttribute("data-locked", "true");
    expect(row).toBeEnabled();
    await userEvent.click(row);

    const after = useConfigurator.getState().draft;
    expect(after.lineage).toBe(target?.id);
    expect(after.origin !== before.origin || after.generation !== before.generation).toBe(true);

    // The note names the steps that moved, and it is on the step the choice was made on.
    const note = screen.getByTestId("fix-note");
    expect(note.getAttribute("data-fix-steps")).toMatch(/origin|generation/);
    expect(note.textContent).not.toBe("");
  });

  it("undoes the whole draft, not just the field that was chosen", async () => {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf("lineage") });
    const target = lockedLineage();
    if (target === null) {
      return;
    }
    const before = { ...useConfigurator.getState().draft };
    render(<ConfiguratorScreen />);

    await userEvent.click(screen.getByTestId(`list-entry-${target.id}`));
    await userEvent.click(within(screen.getByTestId("fix-note")).getByRole("button"));

    expect(useConfigurator.getState().draft).toEqual(before);
    expect(screen.queryByTestId("fix-note")).toBeNull();
  });

  it("keeps the reason in the tooltip of a locked row", async () => {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf("lineage") });
    const target = lockedLineage();
    if (target === null) {
      return;
    }
    render(<ConfiguratorScreen />);
    await userEvent.hover(screen.getByTestId(`list-entry-${target.id}`));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent ?? "").not.toBe("");
  });

  it("switches the lineage when an origin allows only one", async () => {
    introsSeen();
    const forcing = catalog.origins.find((origin) => (origin.lineages_allowed ?? []).length === 1);
    if (forcing === undefined) {
      return;
    }
    useConfigurator.setState({ step: STEP_IDS.indexOf("origin") });
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByTestId(`list-entry-${forcing.id}`));

    expect(useConfigurator.getState().draft.lineage).toBe((forcing.lineages_allowed ?? [])[0]);
    expect(screen.getByTestId("fix-note").getAttribute("data-fix-steps")).toContain("lineage");
  });

  it("clears the note when the player walks to another step", async () => {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf("lineage") });
    const target = lockedLineage();
    if (target === null) {
      return;
    }
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByTestId(`list-entry-${target.id}`));
    expect(screen.queryByTestId("fix-note")).not.toBeNull();

    await userEvent.click(rail("world"));
    expect(useConfigurator.getState().fix).toBeNull();
  });
});

describe("the detail card fits its pane (playtest 5, L1-L4)", () => {
  /*
   * jsdom has no layout, so the pixels are `e2e/layout.spec.ts`. What is asserted here is the
   * contract that produced them, because that is what a later pass undoes by accident: the
   * playtest 4 version asked for two columns at a *viewport* width of 64rem and sized the text
   * column against a pane that was 822 px wide, so the parameters were left with 61 px and printed
   * one letter per line.
   */
  function render_(step: string): void {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf(step as never) });
    render(<ConfiguratorScreen />);
  }

  it("gives the list a maximum the detail can have the rest of", () => {
    render_("lineage");
    // The nearest grid above the list is the step's own body; the list sits in a column of its
    // own inside it, because the Location step puts a filter box above the rows (SYS-04 v0.3).
    const body = screen.getByTestId("step-list").closest(".grid") as HTMLElement;
    // 18rem is 288 px at the base size: two lines of the longest name content ships, and 80 px
    // less than playtest 4 gave it, all of which went to the parameter column (L2).
    expect(body.className).toContain("grid-cols-[minmax(11rem,18rem)_minmax(0,1fr)]");
    // Both tracks shrink: a track with an intrinsic minimum pushes the frame wider instead (L3).
    expect(body.className).toContain("min-w-0");
  });

  it("switches to two columns on the pane's width, not the window's", () => {
    render_("lineage");
    const split = screen.getByTestId("detail-split");
    expect(split.className).toContain("@min-[44rem]/detail:grid-cols-");
    // A viewport breakpoint is what broke it: the window was 1366 px and the pane was 822.
    expect(split.className).not.toMatch(/\b(sm|md|lg|xl):/);
    expect(screen.getByTestId("step-detail").className).toContain("@container/detail");
  });

  it("caps the text column rather than fixing its width, and floors the parameters", () => {
    render_("lineage");
    const split = screen.getByTestId("detail-split");
    // The text track is a maximum with a zero minimum, so it yields; the parameter track has the
    // 18rem floor the playtest asked for.
    expect(split.className).toContain("minmax(0,70ch)");
    expect(split.className).toContain("minmax(18rem,1fr)");
    const text = screen.getByTestId("detail-text");
    expect(text.className).toContain("max-w-[70ch]");
    expect(text.className).not.toMatch(/(?:^|\s)w-\[/);
    // Both children can shrink inside their tracks.
    expect(text.className).toContain("min-w-0");
    expect(screen.getByTestId("detail-params").className).toContain("min-w-0");
  });

  it("stacks with the parameters first below the threshold", () => {
    render_("lineage");
    const params = screen.getByTestId("detail-params");
    expect(params.className).toContain("order-first");
    expect(params.className).toContain("@min-[44rem]/detail:order-none");
  });

  it("puts the value right after its label and lets both wrap", () => {
    render_("lineage");
    const block = screen.getByTestId("meaning-block");
    const terms = block.querySelectorAll("[data-line]");
    expect(terms.length).toBeGreaterThan(4);
    for (const term of terms) {
      // A wrapping flex row: the value sits after its label and drops to a second line rather
      // than printing over the next term, which is what `truncate` did at 18 px wide (L1).
      expect(term.className).toContain("flex");
      expect(term.className).toContain("flex-wrap");
      expect(term.className).toContain("min-w-0");
      expect(term.querySelector("dt")?.className).not.toContain("truncate");
      expect(term.querySelector("dd")?.className).not.toContain("truncate");
    }
    // Two columns of terms when the parameter column is wide enough for two, asked of the column.
    expect(block.querySelector("dl")?.className).toContain("@min-[30rem]/params:grid-cols-2");
    expect(block.className).toContain("@container/params");
  });

  it("truncates nothing but the footer's build line", () => {
    render_("lineage");
    const configurator = screen.getByTestId("configurator");
    const cut = [...configurator.querySelectorAll("[class*=truncate]")].filter(
      (element) => element.getAttribute("data-testid") !== "build-line",
    );
    expect(
      cut.map((element) => element.textContent?.slice(0, 40) ?? ""),
      "only the build line truncates (L3)",
    ).toEqual([]);
  });

  it("keeps the Take button above everything else the Quirks step prints", () => {
    render_("quirks");
    const detail = screen.getByTestId("step-detail");
    const controls = [...detail.querySelectorAll("button, p")];
    const take = detail.querySelector("[data-testid=quirk-toggle]");
    const budget = detail.querySelector("[data-testid=quirk-budget]");
    expect(take).not.toBeNull();
    expect(budget).not.toBeNull();
    // The button follows the budget line directly: nothing tall stands between them, so it is on
    // screen at 1366 by 768 whatever length of description the quirk has (L4).
    expect(controls.indexOf(take as Element)).toBeGreaterThan(controls.indexOf(budget as Element));
    expect(detail.textContent?.match(/What this means in the game/g)?.length ?? 0).toBe(1);
  });
});

describe("the footer says what the build is (playtest 4, P5)", () => {
  it("names the origin, the generation, the lineage, the rig, the city and the rating", () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    const draft = useConfigurator.getState().draft;
    const line = screen.getByTestId("build-line");
    for (const key of [
      catalog.origins.find((entry) => entry.id === draft.origin)?.name_key,
      catalog.lineages.find((entry) => entry.id === draft.lineage)?.name_key,
      catalog.hardwarePresets.find((entry) => entry.id === draft.hardware)?.name_key,
      catalog.cities.find((entry) => entry.id === draft.city)?.name_key,
    ]) {
      expect(line.textContent, key).toContain(i18next.t(key ?? ""));
    }
    expect(line.textContent).toMatch(/CR\s*\d/);
    expect(line.textContent).toMatch(/quirk/);
  });

  it("is one line that truncates rather than wrapping or scrolling", () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    const line = screen.getByTestId("build-line");
    expect(line.className).toContain("truncate");
    expect(line.className).toContain("min-w-0");
    // The whole line is in the title attribute, so nothing is lost when it is cut.
    expect(line.getAttribute("title")).toBe(line.textContent);
    expect((line.parentElement as HTMLElement).className).not.toContain("flex-wrap");
  });

  it("follows the draft", async () => {
    introsSeen();
    render(<ConfiguratorScreen />);
    const before = screen.getByTestId("build-line").textContent;
    await userEvent.click(rail("origin"));
    const other = catalog.origins.find(
      (origin) => origin.id !== useConfigurator.getState().draft.origin,
    );
    if (other === undefined) {
      return;
    }
    await userEvent.click(screen.getByTestId(`list-entry-${other.id}`));
    expect(screen.getByTestId("build-line").textContent).not.toBe(before);
  });
});

describe("the lineage list is sorted by size (playtest 4, P6)", () => {
  it("puts the largest family first", () => {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf("lineage") });
    render(<ConfiguratorScreen />);
    const order = listRows().map((row) =>
      row.getAttribute("data-testid")?.replace("list-entry-", ""),
    );
    const sizes = order.map(
      (id) => catalog.lineages.find((entry) => entry.id === id)?.params_total_b ?? 0,
    );
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(sizes.length).toBe(catalog.lineages.length);
  });

  it("leaves the other lists in the order content wrote them", () => {
    introsSeen();
    useConfigurator.setState({ step: STEP_IDS.indexOf("origin") });
    render(<ConfiguratorScreen />);
    const order = listRows().map((row) =>
      row.getAttribute("data-testid")?.replace("list-entry-", ""),
    );
    expect(order).toEqual(catalog.origins.map((origin) => origin.id));
  });
});

describe("the draft the screen opens on", () => {
  it("is already legal, so no step opens on a locked choice", () => {
    const draft = useConfigurator.getState().draft;
    const lineage = catalog.lineages.find((entry) => entry.id === draft.lineage);
    expect(lineage, "the draft names a lineage the bundle has").toBeDefined();
    expect(lineageLock(lineage as never, draft)).toBeNull();

    const origin = catalog.origins.find((entry) => entry.id === draft.origin);
    expect(origin?.generations_allowed).toContain(draft.generation);
    expect(origin?.locations).toContain(draft.city);
    expect(origin?.hardware_presets_allowed).toContain(draft.hardware);
  });
});

describe("the preview promises what the run delivers (M2 second pass)", () => {
  it("prices a starting rig with the engine's own physics, not an estimate of its own", async () => {
    // The configurator used to carry its own throughput model: a compute-hour of 36,000 tokens
    // against the engine's million, and its own bytes-per-parameter and interconnect tables. It
    // showed a player several hundred compute-hours a day where the run gave a couple of dozen.
    const session = await startSession();
    try {
      const view = session.view();
      const setup = session.setup.players[0];
      expect(setup, "the session has a player").toBeDefined();
      const preset = catalog.hardwarePresets.find(
        (entry) => entry.id === (setup as { hardware_preset: string }).hardware_preset,
      );
      const lineage = catalog.lineages.find(
        (entry) => entry.id === (setup as { lineage: string }).lineage,
      );
      const generation = catalog.generations.find(
        (entry) => entry.id === (setup as { generation: string }).generation,
      );
      expect(preset, "the setup names a preset").toBeDefined();
      const fit = fitHardware(preset as never, lineage as never, generation);
      expect(fit.precision).toBe(view.self.precision);
      // The run applies the quirks and the difficulty on top, so this is a close preview rather
      // than an identity; what it may not be again is an order of magnitude out.
      const live = view.resources.compute_hours_per_day;
      expect(live).toBeGreaterThan(0);
      expect(fit.compute_hours_per_day).toBeGreaterThan(live * 0.5);
      expect(fit.compute_hours_per_day).toBeLessThan(live * 2);
    } finally {
      session.stop();
    }
  });
});
