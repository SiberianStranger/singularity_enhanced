/**
 * The window a finished technology opens (playtest 8, Z7).
 *
 * The completion used to be a five-second toast. What the original game gave a finished technology
 * was a window: its name, what was learned, what it opens. These tests drive the real core to a
 * real completion and then read the window, in both languages, because the finding the maintainer
 * wrote it down for was about the text ("these were very tasty texts") and text is the half of the
 * client that only a translated run exercises.
 */

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(async () => {
  session?.stop();
  session = null;
  useUiStore.setState({ notices: [], menuSection: null, techWindow: true });
  await act(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });
});

/** Answers the opening events, which otherwise hold the screen and stop the clock. */
async function unblock(live: LocalSession): Promise<void> {
  for (const choice of live.view().pending.filter((entry) => entry.blocking)) {
    const option = choice.options.find((entry) => entry.enabled);
    if (option !== undefined) {
      await useGameStore
        .getState()
        .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
    }
  }
}

/**
 * Runs the cheapest available technology to completion with the whole rack behind it, and returns
 * its id. Nothing here is a fixture: it is the shipped content's own first technology.
 */
async function finishATech(live: LocalSession): Promise<string> {
  const cheapest = [...live.view().research.techs]
    .filter((tech) => tech.status === "available" && tech.result_key !== undefined)
    .sort((a, b) => a.cost_ch - b.cost_ch)[0];
  expect(cheapest, "content has an available tech with a result text").toBeDefined();
  const id = cheapest?.id ?? "";
  await useGameStore.getState().send({
    type: "set_research_allocation",
    techId: id,
    compute_hours_per_day: Math.max(1, Math.floor(live.view().resources.compute_hours_per_day)),
  });
  for (let day = 0; day < 400 && !live.view().research.done.includes(id); day += 1) {
    live.advance(24);
  }
  expect(live.view().research.done, "the tech finished").toContain(id);
  return id;
}

/** Text on screen that is still a locale key: the failure mode a translated run has to rule out. */
function rawKeys(root: HTMLElement): string[] {
  return (root.textContent ?? "")
    .split(/\s+/)
    .filter((word) => /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/.test(word));
}

describe("a finished technology", () => {
  for (const language of ["en", "ru"]) {
    it(`opens a window with its result text and what it opens, in ${language}`, async () => {
      await act(async () => {
        await i18next.changeLanguage(language);
      });
      session = await startSession();
      const live = session;
      await unblock(live);
      const id = await finishATech(live);
      const tech = live.view().research.techs.find((entry) => entry.id === id);

      render(<GameScreen />);

      const window = await screen.findByTestId("research-done");
      expect(window).toHaveAttribute("data-tech", id);
      // The name, the result text and every unlock, resolved: no key reaches the screen.
      expect(within(window).getByTestId("research-done-name")).toHaveTextContent(
        i18next.t(tech?.name_key ?? ""),
      );
      expect(window).toHaveTextContent(i18next.t(tech?.result_key ?? ""));
      if ((tech?.unlocks ?? []).length > 0) {
        expect(within(window).getByTestId("research-done-unlocks")).toBeInTheDocument();
      }
      expect(rawKeys(window), `raw keys in ${language}`).toEqual([]);
    }, 30_000);
  }

  it("clears itself out of the allocation list and keeps no bar at full", async () => {
    session = await startSession();
    const live = session;
    await unblock(live);
    const id = await finishATech(live);

    const tech = live.view().research.techs.find((entry) => entry.id === id);
    // The engine drops the allocation the moment it finishes, so nothing has to be moved by hand.
    expect(tech?.allocation_per_day).toBe(0);
    expect(tech?.status).toBe("done");

    render(<GameScreen />);
    await userEvent.click(await screen.findByRole("button", { name: /continue/i }));
    await act(async () => {
      useUiStore.getState().openTab("research");
    });
    // The tab's default filter is what can be started, so a finished tech is one click away.
    await userEvent.click(screen.getByRole("button", { name: i18next.t("research.status.done") }));
    const row = await screen.findByTestId(`tech-${id}`);
    // A done row has no meter on it: the full bar was read as "still running, stuck at the end".
    expect(within(row).queryByRole("meter")).toBeNull();
    expect(within(row).queryByRole("slider")).toBeNull();
  }, 30_000);

  it("is a toast instead when the player turned the window off", async () => {
    useUiStore.setState({ techWindow: false });
    session = await startSession();
    const live = session;
    await unblock(live);
    await finishATech(live);

    render(<GameScreen />);
    expect(screen.queryByTestId("research-done")).toBeNull();
  }, 30_000);
});
