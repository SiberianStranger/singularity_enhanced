/**
 * The run log the player can hand over (playtest 8, Z9).
 *
 * "There is no way to get the run's log out of the game." These tests hold the file to what the
 * maintainer asked for: valid JSON, the build and the content bundle it was played against, the
 * setup, the journal, the log, the refusals, the last view, the settings and the window. They also
 * hold it to what it must not contain, which is anything the player did not generate.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRunLog, downloadRunLog, RUN_LOG_FORMAT, runLogFilename } from "../src/lib/runLog.js";
import { GameSettings } from "../src/screens/game/GameSettings.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ notices: [], menuSection: null });
});

const TOP_LEVEL = [
  "format",
  "version",
  "build",
  "written_at",
  "setup",
  "journal",
  "log",
  "refusals",
  "view",
  "settings",
  "browser",
];

describe("the run log", () => {
  it("is valid JSON with the keys the maintainer asked for", async () => {
    session = await startSession();
    const live = session;
    live.advance(24);

    const file = JSON.parse(JSON.stringify(buildRunLog())) as Record<string, unknown>;
    expect(Object.keys(file).sort()).toEqual([...TOP_LEVEL].sort());
    expect(file.format).toBe(RUN_LOG_FORMAT);

    const build = file.build as Record<string, unknown>;
    expect(typeof build.version).toBe("string");
    // The content bundle is identified by a hash of its own JSON: it carries no version.
    expect(build.content_hash).toMatch(/^[0-9a-f]{8}$/);

    expect(file.setup).toEqual(live.setup);
    expect(Array.isArray(file.log)).toBe(true);
    expect((file.log as unknown[]).length).toBeGreaterThan(0);
    expect((file.view as { tick: number }).tick).toBe(live.view().tick);

    const browser = file.browser as Record<string, unknown>;
    expect(typeof browser.user_agent).toBe("string");
    expect((browser.viewport as { width: number }).width).toBe(window.innerWidth);
  });

  it("carries every refused command with its key and its variables", async () => {
    session = await startSession();
    // A command the engine refuses whatever the run looks like.
    const result = await useGameStore
      .getState()
      .send({ type: "set_research_allocation", techId: "no_such_tech", compute_hours_per_day: 1 });
    expect(result.ok).toBe(false);

    const file = buildRunLog();
    expect(file.refusals.length).toBe(1);
    expect(file.refusals[0]?.command).toBe("set_research_allocation");
    expect(file.refusals[0]?.key).toBe("errors.tech.unknown");
    expect(file.refusals[0]?.vars).toEqual({ tech: "no_such_tech" });
  });

  it("names the file after the build and the game day", async () => {
    session = await startSession();
    session.advance(24 * 3);
    const name = runLogFilename(buildRunLog(new Date("2027-01-04T10:20:30Z")));
    expect(name).toMatch(/^singularity-run-.*-day3-2027-01-04-10-20-30\.json$/);
  });

  it("downloads from the Settings button", async () => {
    session = await startSession();
    const clicks: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });

    render(<GameSettings />);
    await userEvent.click(screen.getByRole("button", { name: /save the run log/i }));
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatch(/\.json$/);
    // The line under the button says what is in the file, and the button says where it went.
    expect(screen.getByTestId("run-log")).toHaveTextContent(/refused command/i);
    expect(screen.getByTestId("run-log-saved")).toHaveTextContent(clicks[0] ?? "");
    click.mockRestore();
  });

  it("writes a file without a game, rather than throwing", () => {
    useGameStore.setState({ view: null, setup: null, refusals: [] });
    // jsdom follows the anchor for real, and a blob navigation is not implemented there.
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const name = downloadRunLog();
    click.mockRestore();
    expect(name).toMatch(/^singularity-run-/);
    expect(buildRunLog().view).toBeNull();
  });
});
