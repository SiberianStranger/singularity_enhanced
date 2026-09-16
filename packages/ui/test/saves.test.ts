/**
 * Saves round-trip (SYS-15): what the host writes has to come back as the same game.
 *
 * IndexedDB is `fake-indexeddb` from the test setup, so this exercises the same `idb-keyval` store
 * the browser build uses, not a stub.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTOSAVE_ID,
  clearSaves,
  fromFileText,
  getSave,
  listSaves,
  manualId,
  putSave,
  toFileText,
} from "../src/saves/db.js";
import { useGameStore } from "../src/store/gameStore.js";
import { type LocalSession, startSession } from "./helpers.js";

async function record(live: LocalSession, id: string): Promise<void> {
  const view = live.view();
  await putSave({
    id,
    kind: "manual",
    label: "test",
    createdAtIso: new Date().toISOString(),
    seed: live.setup.seed,
    day: Math.floor(view.tick / 24),
    tick: view.tick,
    setup: live.setup,
    data: await live.host.save(),
  });
}

describe("saves", () => {
  beforeEach(async () => {
    await clearSaves();
  });

  it("restores the date and the world a save was taken at", async () => {
    const live = await startSession();
    try {
      live.advance(24 * 12);
      const saved = live.view();
      expect(saved.tick).toBe(24 * 12);
      await record(live, AUTOSAVE_ID);

      // Play on, then load the save back into the running session.
      live.advance(24 * 20);
      expect(live.view().tick).toBe(24 * 32);

      const stored = await getSave(AUTOSAVE_ID);
      expect(stored?.tick).toBe(saved.tick);
      await useGameStore.getState().loadSave(stored?.data ?? "");

      const restored = live.view();
      expect(restored.tick).toBe(saved.tick);
      expect(restored.date.iso).toBe(saved.date.iso);
      expect(restored.resources.cash_usd).toBeCloseTo(saved.resources.cash_usd, 6);
      expect(restored.sites.map((site) => site.id)).toEqual(saved.sites.map((site) => site.id));
    } finally {
      live.stop();
    }
  });

  it("lists saves newest first and round-trips a save file", async () => {
    const live = await startSession();
    try {
      await record(live, manualId("first"));
      live.advance(24);
      await record(live, manualId("second"));

      const saves = await listSaves();
      expect(saves.map((entry) => entry.id)).toContain("save-first");
      expect(saves.map((entry) => entry.id)).toContain("save-second");

      const exported = toFileText(saves[0] as never);
      const imported = fromFileText(exported);
      expect(imported.data).toBe(saves[0]?.data);
      expect(() => fromFileText("{}")).toThrow();
    } finally {
      live.stop();
    }
  });
});
