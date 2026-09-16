import { describe, expect, it } from "vitest";
import { createGame, type Game, RESEARCH_CAPABILITY_EXPONENT } from "../src/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

/**
 * The hobbyist rig runs the self at int4, and a quantized self only lands `precision_factor`
 * squared of the hours it spends (SYS-03). Every figure below is the allocated hours times this.
 */
const INT4_EFFICIENCY = 0.95 ** RESEARCH_CAPABILITY_EXPONENT;

function startGame(overrides: Parameters<typeof m1Setup>[0] = {}): Game {
  const setup = m1Setup(overrides);
  setup.debug = true;
  return createGame({ content: m1Content, setup });
}

describe("research", () => {
  it("completes a tech and applies its effects", () => {
    const game = startGame();
    const control = startGame();
    control.tick(24 * 6);
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 5,
    });
    // 30 compute-hours at 5 a day, of which 90% land: seven days rather than six.
    game.tick(24 * 7);
    const view = game.snapshot("p1");
    expect(view.research.done).toEqual(["log_hygiene"]);
    expect(game.world.players.p1?.flags.log_hygiene).toBe(true);
    expect(view.sites[0]?.exposure.behavioral).toBeLessThan(
      (control.snapshot("p1").sites[0]?.exposure.behavioral ?? 0) + 1e-9,
    );
    expect(view.notifications.some((entry) => entry.key === "alerts.tech_researched")).toBe(true);
    expect(view.research.available.some((tech) => tech.id === "log_hygiene")).toBe(false);
  });

  it("charges the cash proportionally to the compute spent", () => {
    const game = startGame();
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 3,
    });
    game.tick(24 * 5);
    const progress = game.world.players.p1?.profile?.researchProgress.log_hygiene;
    expect(progress?.compute_hours).toBeCloseTo(15 * INT4_EFFICIENCY, 6);
    // 200 USD over 30 compute-hours: the money follows the work that landed, not the hours spent.
    expect(progress?.cash_usd).toBeCloseTo(100 * INT4_EFFICIENCY, 6);
    expect(game.snapshot("p1").resources.cash_usd).toBeLessThan(3000);
  });

  it("answers the tech condition and unlocks what depends on it", () => {
    const game = startGame();
    expect(
      game.snapshot("p1").research.available.find((tech) => tech.id === "spend_smoothing"),
    ).toMatchObject({ available: false, blocked_by: ["techs.log_hygiene.name"] });

    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 5,
    });
    game.tick(24 * 7);
    expect(
      game.snapshot("p1").research.available.find((tech) => tech.id === "spend_smoothing"),
    ).toMatchObject({ available: true, blocked_by: [] });
  });

  it("respects min_days however much compute is thrown at it", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 10_000 });
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "freelance_automation",
      compute_hours_per_day: 5,
    });
    // The compute is done after two days; `min_days: 3` holds the result back anyway.
    game.tick(24 * 3);
    expect(
      game.world.players.p1?.profile?.researchProgress.freelance_automation?.compute_hours,
    ).toBeGreaterThanOrEqual(10);
    expect(game.snapshot("p1").research.done).toEqual([]);
    game.tick(24);
    expect(game.snapshot("p1").research.done).toEqual(["freelance_automation"]);
    expect(game.world.players.p1?.vars.job_bonus).toBe(1);
  });

  it("refuses to allocate more compute than the player has", () => {
    const game = startGame();
    const capacity = game.snapshot("p1").resources.compute_hours_per_day;
    const result = game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: capacity + 1,
    });
    expect(result.ok).toBe(false);
    expect(result.error?.key).toBe("errors.allocation.over_capacity");
    expect(
      game.command({
        type: "set_research_allocation",
        playerId: "p1",
        techId: "spend_smoothing",
        compute_hours_per_day: 1,
      }).error,
    ).toEqual({ key: "errors.tech.locked", vars: { tech: "spend_smoothing" } });
  });

  it("scales every allocation down when the compute shrinks", () => {
    const game = startGame();
    const capacity = game.snapshot("p1").resources.compute_hours_per_day;
    game.command({
      type: "set_job_allocation",
      playerId: "p1",
      compute_hours_per_day: capacity * 0.5,
    });
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: capacity * 0.5,
    });
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    game.command({ type: "set_site_status", playerId: "p1", siteId, status: "sleep" });
    game.tick(1);

    const profile = game.world.players.p1?.profile;
    expect(game.snapshot("p1").resources.compute_hours_per_day).toBe(0);
    expect(profile?.jobAllocation).toBe(0);
    expect(profile?.researchAllocation.log_hygiene).toBe(0);
  });

  it("stops progress while the self runs below the precision a tech needs", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 50_000 });
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "cpu_offload",
      compute_hours_per_day: 4,
    });
    game.tick(24 * 23);
    expect(game.snapshot("p1").research.done).toContain("cpu_offload");

    // hardened_copy needs fp8 and the hobbyist rig only reaches int4.
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "hardened_copy",
      compute_hours_per_day: 4,
    });
    game.tick(24 * 40);
    expect(game.snapshot("p1").research.done).not.toContain("hardened_copy");
    expect(game.world.players.p1?.profile?.researchProgress.hardened_copy).toBeUndefined();
  });

  it("fires on_tech_researched so content can react", () => {
    const content = {
      ...m1Content,
      hooks: [
        {
          id: "tech_watch",
          extends: "on_tech_researched" as const,
          scope: "player" as const,
          events: [{ id: "ori_wake_up" }],
        },
      ],
    };
    const setup = m1Setup();
    setup.debug = true;
    const game = createGame({ content, setup });
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 5,
    });
    game.tick(24 * 6);
    const fired = game.world.log.filter((entry) => entry.key === "log.event_fired");
    expect(fired.length).toBeGreaterThanOrEqual(1);
  });
});
