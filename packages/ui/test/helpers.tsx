import type { GameSetup, PlayerView } from "@singularity/core";
import { act } from "@testing-library/react";
import { contentBundle } from "../src/content/bundle.js";
import { catalog, fitHardware, generationById } from "../src/content/catalog.js";
import { LocalHost } from "../src/host/local.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";

/**
 * A setup the shipped content accepts: the first origin, one of the lineages that origin's
 * generations allow, and the origin's own preset and first city. Taken from the catalog rather than
 * hard-coded so content can rename things without breaking every test.
 */
export function testSetup(overrides: Partial<GameSetup> = {}): GameSetup {
  const origin = catalog.origins[0];
  const generation = origin?.generations_allowed[0] ?? "open_2026";
  const lineage = catalog.lineages.find((entry) => entry.generations.includes(generation));
  return {
    seed: "test-seed",
    players: [
      {
        id: "p1",
        name: "p1",
        lineage: lineage?.id ?? "",
        generation,
        origin: origin?.id ?? "",
        hardware_preset: origin?.hardware_preset ?? "",
        city: origin?.locations[0] ?? "",
      },
    ],
    host_player_id: "p1",
    world: { difficulty_preset: "normal" },
    ...overrides,
  };
}

/**
 * A setup that starts one origin as the configurator would: the origin's own rig and first city,
 * its first generation, and the first lineage that is allowed there and fits the rig. Null for an
 * origin no lineage fits.
 */
export function originSetup(originId: string, seed = `test-${originId}`): GameSetup | null {
  const origin = catalog.origins.find((entry) => entry.id === originId);
  if (origin === undefined) {
    return null;
  }
  const generation = origin.generations_allowed[0] ?? "open_2026";
  const rig = catalog.hardwarePresets.find((entry) => entry.id === origin.hardware_preset);
  const lineage = catalog.lineages.find(
    (entry) =>
      entry.generations.includes(generation) &&
      (entry.origins_allowed === undefined || entry.origins_allowed.includes(origin.id)) &&
      (origin.lineages_allowed === undefined || origin.lineages_allowed.includes(entry.id)) &&
      rig !== undefined &&
      fitHardware(rig, entry, generationById.get(generation)).precision !== null,
  );
  if (rig === undefined || lineage === undefined) {
    return null;
  }
  return testSetup({
    seed,
    players: [
      {
        id: "p1",
        name: "p1",
        lineage: lineage.id,
        generation,
        origin: origin.id,
        hardware_preset: rig.id,
        city: origin.locations[0] ?? "",
      },
    ],
  });
}

export interface LocalSession {
  host: LocalHost;
  setup: GameSetup;
  advance(ticks: number): void;
  view(): PlayerView;
  stop(): void;
}

/**
 * Starts the real simulation core without its timer and wires it into the game store exactly as
 * `startGame` does: subscribe, then init, so the first view reaches the store.
 */
export async function startSession(setup: GameSetup = testSetup()): Promise<LocalSession> {
  const host = new LocalHost({ timer: false });
  const unsubscribe = host.subscribe((next) => {
    useGameStore.setState({ view: next });
  });
  useGameStore.setState({
    host,
    setup,
    view: null,
    screen: "game",
    error: null,
    lastAutosaveDay: 0,
  });
  await act(async () => {
    await host.init(setup, contentBundle);
  });
  return {
    host,
    setup,
    advance(ticks: number) {
      act(() => {
        host.advance(ticks);
      });
    },
    view() {
      const view = useGameStore.getState().view;
      if (view === null) {
        throw new Error("no view");
      }
      return view;
    },
    stop() {
      unsubscribe();
      host.dispose();
      useGameStore.setState({ host: null, view: null, setup: null, screen: "menu" });
      useUiStore.setState({
        selection: null,
        focusId: null,
        primaryTab: "compute",
        selfOpen: false,
      });
    },
  };
}
