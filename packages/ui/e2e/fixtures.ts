/**
 * Save fixtures for the browser specs: a run put into a state the player would need game weeks to
 * reach.
 *
 * The client can only be driven from the outside, so a spec that needs a channel already open would
 * otherwise have to research `borrowed_inference`, wait for the compute-hours, run the top-up
 * operation and wait again, which is five game weeks of clock and four things that can go wrong for
 * reasons the spec is not about. Instead the same core the browser runs builds the world here, in
 * node, and the file is handed to the client's own save importer, so what the spec opens is a real
 * save loaded through the real path.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ContentBundle,
  createGame,
  createSite,
  type GameSetup,
  newChannelState,
  serialize,
  sitesOf,
  TICKS_PER_DAY,
} from "@singularity/core";
import { SETUP } from "./helpers.js";

/** The compiled bundle as the core reads it; `helpers.ts` reads the same file for its own ids. */
const content = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../content/build/bundle.json"),
    "utf8",
  ),
) as ContentBundle;

/** What the client's save importer accepts (`packages/ui/src/saves/db.ts`). */
export interface SaveFile {
  id: string;
  kind: "manual";
  label: string;
  createdAtIso: string;
  seed: string;
  day: number;
  tick: number;
  setup: GameSetup;
  data: string;
}

/**
 * The fixed run with the free tier and the grey relay open (SYS-25).
 *
 * The techs are granted rather than researched and the blocks are placed rather than won, because
 * the spec is about the panel and not about the road to it. Everything else is the engine's: the
 * site is made with `createSite` the way `ensureChannel` makes it, and a day is ticked so the
 * derived compute-hours, the exposure and the finance line are the ones the systems produce.
 */
export function borrowedSave(): SaveFile {
  const setup = SETUP as unknown as GameSetup;
  const game = createGame({
    seed: setup.seed,
    content,
    setup,
    hostPlayerId: setup.host_player_id ?? "p1",
  });
  const world = game.world;
  const profile = world.players.p1?.profile;
  if (profile === undefined || profile === null) {
    throw new Error("the fixed setup produced no player profile");
  }
  profile.techsDone.push("borrowed_inference", "relay_brokerage");

  const home = sitesOf(world, "p1")[0];
  if (home === undefined) {
    throw new Error("the fixed setup produced no site to put a channel beside");
  }
  // Two channels, so the block has both a free one and one with a bill: the relay is the only
  // source of the `finances.cost.borrowed` line the Finances tab prints.
  for (const [channel, blocks, quality] of [
    ["free_tier", 2, 6],
    ["grey_relay", 1, 5],
  ] as const) {
    const state = newChannelState(channel, 0);
    state.blocks = blocks;
    state.qualityRoll = quality;
    state.status = "healthy";
    createSite(world, content, {
      owner: "p1",
      kind: "borrowed_channel",
      city: home.city,
      name: channel,
      nodes: [],
      readyTick: world.clock.tick,
      role: "none",
      graceFactor: 1,
      identity: null,
      borrowed: state,
    });
  }

  // One day, so the borrowed system derives the capacity, the exposure and the bill itself.
  game.tick(TICKS_PER_DAY);

  return {
    id: "save-borrowed-fixture",
    kind: "manual",
    label: "borrowed fixture",
    createdAtIso: "2027-01-02T00:00:00.000Z",
    seed: setup.seed,
    day: Math.floor(world.clock.tick / TICKS_PER_DAY),
    tick: world.clock.tick,
    setup,
    data: serialize(world),
  };
}
