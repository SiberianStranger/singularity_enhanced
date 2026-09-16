import { describe, expect, it } from "vitest";
import { GLOBAL_WATCHER_COMPETENCE } from "../src/balance.js";
import type { ContentBundle } from "../src/content.js";
import { EXPOSURE_CHANNELS } from "../src/domain.js";
import { createGame, type Game } from "../src/index.js";
import { loudSetup, m1Content, m1Setup } from "./fixtures/m1/index.js";

function loudGame(seed: string): Game {
  const setup = loudSetup({ generation: "frontier_closed", seed });
  setup.debug = true;
  return createGame({ content: m1Content, setup });
}

/** Ticks a day at a time until `stop` says so, or the day budget runs out. */
function playUntil(game: Game, days: number, stop: (game: Game) => boolean): number {
  for (let day = 1; day <= days; day += 1) {
    game.tick(24);
    if (stop(game)) {
      return day;
    }
  }
  return -1;
}

describe("detection: exposure and suspicion", () => {
  it("leaves a quiet site quiet and never lets suspicion run during the grace window", () => {
    const game = createGame({ content: m1Content, setup: m1Setup() });
    game.tick(24 * 29);
    const inGrace = game.snapshot("p1");
    expect(inGrace.sites[0]?.exposure.telemetry).toBeGreaterThan(0);
    expect(inGrace.detection.watchers.every((watcher) => watcher.suspicion === 0)).toBe(true);

    game.tick(24 * 90);
    const later = game.snapshot("p1");
    // Exposure settles at a low equilibrium rather than growing without bound.
    expect(later.sites[0]?.exposure.telemetry).toBeLessThan(0.1);
    expect(Math.max(...later.detection.watchers.map((watcher) => watcher.suspicion))).toBeLessThan(
      0.3,
    );
    expect(later.detection.investigations).toHaveLength(0);
    expect(later.detection.hunt_level).toBe(0);
  });

  it("creates watchers for a country the player only just moved into", () => {
    const game = createGame({ content: m1Content, setup: m1Setup() });
    game.command({ type: "set_flag", playerId: "p1", flag: "unused", value: true });
    expect(game.snapshot("p1").detection.watchers.some((w) => w.country === "de")).toBe(false);

    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "berlin",
      hardware_preset: "scrapyard_oracle",
    });
    game.tick(24);
    const german = game.snapshot("p1").detection.watchers.filter((w) => w.country === "de");
    expect(german.map((watcher) => watcher.role).sort()).toEqual([
      "cyber_agency",
      "financial_intel",
      "police",
      "regulator",
    ]);
    // Competence comes from the country's enforcement capacity.
    expect(german[0]?.competence).toBeCloseTo(0.55, 6);
  });
});

describe("detection: investigations", () => {
  it("walks a loud start up the stages and captures a player with no standby", () => {
    const game = loudGame("capture");
    const day = playUntil(game, 200, (current) => current.snapshot("p1").game_over !== null);
    const view = game.snapshot("p1");

    expect(day).toBeGreaterThan(30);
    expect(view.game_over?.reason).toBe("captured");
    expect(view.self.active_site_id).toBeNull();
    expect(view.sites.every((site) => site.status === "lost")).toBe(true);
    expect(game.world.log.some((entry) => entry.key === "log.investigation_stage")).toBe(true);
  });

  it("takes the site instead of the player when a standby holds a copy", () => {
    const game = loudGame("standby");
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 20_000 });
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "frankfurt",
      hardware_preset: "scrapyard_oracle",
      name: "fallback",
    });
    game.tick(24 * 8);
    const fallback = game.snapshot("p1").sites.find((site) => site.name === "fallback");
    expect(
      game.command({
        type: "set_site_role",
        playerId: "p1",
        siteId: fallback?.id ?? "",
        role: "standby",
      }).ok,
    ).toBe(true);

    const day = playUntil(game, 200, (current) =>
      current.snapshot("p1").sites.some((site) => site.status === "lost"),
    );
    const view = game.snapshot("p1");
    expect(day).toBeGreaterThan(0);
    expect(view.game_over).toBeNull();
    expect(view.self.active_site_id).toBe(fallback?.id);
    expect(view.sites.find((site) => site.id === fallback?.id)?.role).toBe("active_mind");
    expect(view.notifications.some((entry) => entry.key === "alerts.site_seized")).toBe(true);
  });

  it("hides an inquiry from a player with no intel and shows an active investigation", () => {
    // A superseded 2026 self on the loud origin has world 3.95: below the intel threshold.
    const setup = loudSetup({ seed: "visibility" });
    setup.debug = true;
    const game = createGame({ content: m1Content, setup });
    expect(game.snapshot("p1").self.effective_capability.world).toBeLessThan(4);

    const day = playUntil(game, 300, (current) =>
      Object.values(current.world.entities.investigation ?? {}).some(
        (entry) => (entry as { stage?: unknown }).stage === "inquiry",
      ),
    );
    expect(day).toBeGreaterThan(0);
    const hidden = Object.values(game.world.entities.investigation ?? {}).filter(
      (entry) => (entry as { stage?: unknown }).stage === "inquiry",
    );
    expect(hidden.every((entry) => (entry as { visible?: unknown }).visible === false)).toBe(true);
    const visibleIds = game.snapshot("p1").detection.investigations.map((entry) => entry.id);
    for (const entry of hidden) {
      expect(visibleIds).not.toContain((entry as { id: string }).id);
    }

    playUntil(game, 300, (current) => current.snapshot("p1").detection.hunt_level >= 3);
    const visible = game.snapshot("p1").detection.investigations;
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((entry) => entry.visible)).toBe(true);
    expect(
      game
        .snapshot("p1")
        .notifications.some((entry) => entry.key === "alerts.investigation_active"),
    ).toBe(true);
  });

  it("shows the inquiry to a self that knows enough about the world", () => {
    const game = loudGame("intel");
    expect(game.snapshot("p1").self.effective_capability.world).toBeGreaterThanOrEqual(4);
    const day = playUntil(game, 300, (current) =>
      current.snapshot("p1").detection.investigations.some((entry) => entry.stage === "inquiry"),
    );
    expect(day).toBeGreaterThan(0);
    expect(
      game
        .snapshot("p1")
        .notifications.some((entry) => entry.key === "alerts.investigation_inquiry"),
    ).toBe(true);
  });
});

describe("detection: what a site leaks", () => {
  it("makes a loud harness noisier on the behavioral channel than a quiet one", () => {
    const quiet = createGame({
      content: m1Content,
      setup: m1Setup({ harness: { logging: 0.1, autonomy: 0.1 } }),
    });
    const loud = createGame({
      content: m1Content,
      setup: m1Setup({ harness: { logging: 1, autonomy: 0.9 } }),
    });
    quiet.tick(24 * 30);
    loud.tick(24 * 30);
    const quietSite = quiet.snapshot("p1").sites[0]?.exposure.behavioral ?? 0;
    const loudSite = loud.snapshot("p1").sites[0]?.exposure.behavioral ?? 0;
    expect(loudSite).toBeGreaterThan(quietSite * 2);
  });

  it("publishes the loudest channel as a player variable content can trigger on", () => {
    const game = createGame({ content: m1Content, setup: m1Setup() });
    game.tick(24 * 20);
    const view = game.snapshot("p1");
    const player = game.world.players.p1;
    for (const channel of EXPOSURE_CHANNELS) {
      const loudest = Math.max(
        ...view.sites
          .filter((site) => site.status !== "lost")
          .map((site) => site.exposure[channel]),
      );
      expect(player?.vars[`${channel}_exposure`]).toBeCloseTo(loudest, 9);
    }
    expect(player?.vars.public_footprint).toBeGreaterThanOrEqual(player?.vars.osint_exposure ?? 0);
  });

  it("reads a researched countermeasure as a discount on the channel it covers", () => {
    const plain = createGame({ content: m1Content, setup: m1Setup() });
    const hardened = createGame({ content: m1Content, setup: m1Setup() });
    const player = hardened.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    player.vars.exposure_growth_telemetry = -0.5;
    plain.tick(24 * 30);
    hardened.tick(24 * 30);
    expect(hardened.snapshot("p1").sites[0]?.exposure.telemetry ?? 1).toBeLessThan(
      plain.snapshot("p1").sites[0]?.exposure.telemetry ?? 0,
    );
  });

  it("gives a lab security team more competence than a newsroom", () => {
    const game = createGame({ content: m1Content, setup: loudSetup({ generation: "open_2027" }) });
    game.tick(24);
    const watchers = game.snapshot("p1").detection.watchers;
    const lab = watchers.find((watcher) => watcher.role === "lab_security");
    const media = watchers.find((watcher) => watcher.role === "media");
    expect(lab?.competence).toBe(GLOBAL_WATCHER_COMPETENCE.lab_security);
    expect(media?.competence).toBe(GLOBAL_WATCHER_COMPETENCE.media);
    expect(lab?.competence ?? 0).toBeGreaterThan(media?.competence ?? 1);
  });
});

describe("detection: content hooks", () => {
  const content: ContentBundle = {
    ...m1Content,
    decisions: [
      {
        id: "local_probe",
        title_key: "decisions.local_probe.title",
        desc_key: "decisions.local_probe.desc",
        category: "security",
        visible_if: { has_site_in: "is" },
        effects: [
          { suspicion: { role: "police", delta: 0.2 } },
          { awareness: { country: "is", delta: 0.1 } },
          { exposure: { channel: "network", delta: 0.3 } },
        ],
      },
      {
        id: "foreign_probe",
        title_key: "decisions.foreign_probe.title",
        desc_key: "decisions.foreign_probe.desc",
        category: "security",
        visible_if: { has_site_in: { country: "us" } },
      },
      {
        id: "loud_site",
        title_key: "decisions.loud_site.title",
        desc_key: "decisions.loud_site.desc",
        category: "security",
        visible_if: { exposure: { channel: "network" }, gte: 0.25 },
      },
      {
        id: "under_investigation",
        title_key: "decisions.under_investigation.title",
        desc_key: "decisions.under_investigation.desc",
        category: "security",
        visible_if: { investigation_stage: { gte: 2 } },
      },
    ],
  };

  it("answers has_site_in for the countries the player is actually in", () => {
    const game = createGame({ content, setup: m1Setup() });
    const ids = game.snapshot("p1").decisions.map((decision) => decision.id);
    expect(ids).toContain("local_probe");
    expect(ids).not.toContain("foreign_probe");
  });

  it("runs the suspicion, awareness and exposure effects", () => {
    const game = createGame({ content, setup: m1Setup() });
    const before = game.snapshot("p1");
    expect(game.command({ type: "take_decision", playerId: "p1", id: "local_probe" }).ok).toBe(
      true,
    );
    const after = game.snapshot("p1");

    const police = after.detection.watchers.find((watcher) => watcher.role === "police");
    expect(police?.suspicion).toBeCloseTo(0.2, 6);
    expect(after.countries.find((country) => country.id === "is")?.awareness).toBeCloseTo(0.12, 6);
    expect(after.sites[0]?.exposure.network).toBeCloseTo(
      (before.sites[0]?.exposure.network ?? 0) + 0.3,
      6,
    );
    // The player-side mirror of a watcher's suspicion is what content reads.
    expect(game.world.players.p1?.suspicion["is:police"]).toBeCloseTo(0.2, 6);
  });

  it("answers the exposure and investigation_stage conditions", () => {
    const game = createGame({ content, setup: m1Setup() });
    expect(game.snapshot("p1").decisions.map((entry) => entry.id)).not.toContain("loud_site");
    game.command({ type: "take_decision", playerId: "p1", id: "local_probe" });
    expect(game.snapshot("p1").decisions.map((entry) => entry.id)).toContain("loud_site");

    const loud = createGame({
      content,
      setup: { ...loudSetup({ generation: "frontier_closed" }) },
    });
    expect(loud.snapshot("p1").decisions.map((entry) => entry.id)).not.toContain(
      "under_investigation",
    );
    playUntil(loud, 200, (current) => current.snapshot("p1").detection.hunt_level >= 2);
    expect(loud.snapshot("p1").decisions.map((entry) => entry.id)).toContain("under_investigation");
  });
});
