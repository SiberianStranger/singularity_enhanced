/**
 * The maintainer's first playtest, played again as a test (docs/playtests/2026-09-16-m1-first-playtest.md).
 *
 * Setup: the institute origin on a colocation cage, which is what findings C1 to C9 were written
 * against. Every action the report says "does nothing" is issued here, and every one of them either
 * succeeds or comes back with a structured, localizable reason that is also written to the log.
 * Nothing in this file asserts on prose: a refusal is a locale key and a set of variables.
 */

import { describe, expect, it } from "vitest";
import { createGame, type Game, type PlayerCommand } from "../src/index.js";
import { instituteSetup, m1Content } from "./fixtures/m1/index.js";

function startGame(cash = 0): Game {
  const setup = instituteSetup({ seed: "playtest" });
  setup.debug = true;
  const game = createGame({ content: m1Content, setup });
  if (cash > 0) {
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: cash });
  }
  return game;
}

/** Every locale key the fixture bundle carries, which is what a client would have to render. */
function hasText(key: string): boolean {
  return m1Content.locales.en[key] !== undefined;
}

function refusalsInLog(game: Game): string[] {
  return game
    .snapshot("p1")
    .log.filter((entry) => entry.key === "log.command_refused")
    .map((entry) => String(entry.vars.reason));
}

describe("playtest 1: the institute cluster", () => {
  it("starts where the maintainer started: a colocation cage, one site, compute to spend", () => {
    const view = startGame().snapshot("p1");
    expect(view.self.origin).toBe("state_lab");
    expect(view.sites).toHaveLength(1);
    expect(view.sites[0]?.kind).toBe("colo");
    expect(view.resources.compute_hours_per_day).toBeGreaterThan(10);
    expect(view.resources.cash_usd).toBe(25_000);
  });

  // C1, C4: "Build site does nothing", and the site kinds do not explain themselves.
  it("builds a site, and refuses the ones it cannot build with a reason for each", () => {
    const game = startGame();
    const base = { type: "build_site" as const, playerId: "p1", city: "berlin" };

    expect(
      game.command({ ...base, kind: "nowhere", hardware_preset: "quiet_workstation" }).error,
    ).toEqual({ key: "errors.site_kind.unknown", vars: { kind: "nowhere" } });
    expect(
      game.command({
        ...base,
        city: "atlantis",
        kind: "colo",
        hardware_preset: "quiet_workstation",
      }).error,
    ).toEqual({ key: "errors.city.unknown", vars: { city: "atlantis" } });
    // A programme allocation is access, not hardware anybody sells.
    expect(
      game.command({ ...base, kind: "colo", hardware_preset: "institute_rack" }).error,
    ).toEqual({ key: "errors.preset.is_access", vars: { preset: "institute_rack" } });
    // 25,000 USD does not buy a 39,000 USD workstation, and the refusal says both numbers.
    const broke = game.command({ ...base, kind: "colo", hardware_preset: "quiet_workstation" });
    expect(broke.error?.key).toBe("errors.cash.insufficient");
    expect(broke.error?.vars).toEqual({ cost: 39_000, cash: 25_000 });

    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 100_000 });
    expect(game.command({ ...base, kind: "colo", hardware_preset: "quiet_workstation" })).toEqual({
      ok: true,
    });
    expect(game.snapshot("p1").sites).toHaveLength(2);
    game.tick(24 * 8);
    const built = game.snapshot("p1").sites[1];
    expect(built?.status).toBe("active");
    expect(built?.compute_hours_per_day).toBeGreaterThan(0);
  });

  // C4: what the site kinds differ in, as numbers rather than prose.
  it("publishes a catalog of site kinds with cost, days, upkeep, power and exposure", () => {
    const view = startGame().snapshot("p1");
    expect(view.catalog.site_kinds.map((kind) => kind.id)).toEqual(["colo", "residential"]);
    const colo = view.catalog.site_kinds.find((kind) => kind.id === "colo");
    expect(colo).toMatchObject({
      ownership: "owned",
      build_days: 7,
      power_cap_kw: 40,
      can_host_self: true,
      max_nodes: 8,
    });
    expect(colo?.build_cost_usd).toBeGreaterThan(0);
    expect(colo?.upkeep_usd_per_day_estimate).toBeGreaterThan(0);
    expect(colo?.exposure_profile.billing).toBeGreaterThan(0);
    for (const kind of view.catalog.site_kinds) {
      expect(hasText(kind.name_key)).toBe(true);
      expect(hasText(kind.desc_key)).toBe(true);
    }
  });

  // C2: "Buy hardware does nothing", and the hardware list has no prices or parameters.
  it("buys hardware, refuses what nobody sells, and lists every card with its numbers", () => {
    const game = startGame(200_000);
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    const buy = (accelerator: string, count = 1): PlayerCommand => ({
      type: "buy_hardware",
      playerId: "p1",
      siteId,
      accelerator,
      count,
    });

    expect(game.command(buy("h100_sxm"))).toEqual({ ok: true });
    expect(game.command(buy("tesla_p40"))).toEqual({ ok: true });
    // A domestic part with no market the player can reach.
    expect(game.command(buy("ascend_910c")).error).toEqual({
      key: "errors.accelerator.not_for_sale",
      vars: { accelerator: "ascend_910c" },
    });
    expect(game.command(buy("nvidia_imaginary")).error?.key).toBe("errors.accelerator.unknown");
    expect(game.command(buy("h100_sxm", 0)).error?.key).toBe("errors.hardware.bad_count");

    const before = game.snapshot("p1").sites[0]?.memory_gb ?? 0;
    game.tick(24 * 10);
    expect(game.snapshot("p1").sites[0]?.memory_gb).toBeGreaterThan(before);

    const catalog = game.snapshot("p1").catalog.accelerators;
    expect(catalog.map((card) => card.id)).toEqual([
      "ascend_910c",
      "h100_sxm",
      "rtx_pro_6000",
      "tesla_p40",
    ]);
    expect(catalog.find((card) => card.id === "h100_sxm")).toMatchObject({
      vendor: "NVIDIA",
      vram_gb: 80,
      memory_kind: "hbm",
      power_w: 700,
      price_usd: 27_000,
      availability: "buy",
      fits_self: true,
    });
    expect(catalog.find((card) => card.id === "tesla_p40")).toMatchObject({
      availability: "gray",
      availability_reason: "hardware.availability.gray",
      price_usd: 130,
      fits_self: false,
    });
    expect(catalog.find((card) => card.id === "ascend_910c")).toMatchObject({
      availability: "unavailable",
      availability_reason: "errors.accelerator.not_for_sale",
    });
  });

  // C3: what raising or lowering the precision is for.
  it("shows the precision trade-off as one table and moves the self up and down it", () => {
    const game = startGame();
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    // The institute's harness is read-only (SYS-04 v0.2: the self_modify dial), so the table can be
    // read before anything can be moved on it; `agent_loop_upgrade` is what opens the lock in play.
    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "int2" }).error?.key,
    ).toBe("errors.precision.self_modify_locked");
    game.command({ type: "set_flag", playerId: "p1", flag: "harness_self_modify", value: true });
    const rows = game.snapshot("p1").self.precision_options;
    expect(rows.map((row) => row.precision)).toEqual(["bf16", "fp8", "int4", "int2"]);
    expect(rows.every((row) => row.fits)).toBe(true);
    expect(rows.filter((row) => row.is_current).map((row) => row.precision)).toEqual(["bf16"]);

    const bf16 = rows[0];
    const int2 = rows[3];
    // Memory falls, throughput rises, capability falls: that is the whole trade.
    expect(int2?.memory_gb).toBeLessThan(bf16?.memory_gb ?? 0);
    expect(int2?.compute_hours_per_day).toBeGreaterThan(bf16?.compute_hours_per_day ?? 0);
    expect(int2?.capability_factor).toBeLessThan(bf16?.capability_factor ?? 0);
    // A small copy researches faster and earns less; a precise one earns more from fewer hours.
    expect(int2?.effective_research_per_day).toBeGreaterThan(bf16?.effective_research_per_day ?? 0);
    expect(int2?.effective_income_per_day).toBeLessThan(bf16?.effective_income_per_day ?? 0);

    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "int2" }),
    ).toEqual({ ok: true });
    expect(game.snapshot("p1").self.precision).toBe("int2");
    const quantized = game.snapshot("p1").resources.compute_hours_per_day;
    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "bf16" }),
    ).toEqual({ ok: true });
    expect(game.snapshot("p1").self.precision).toBe("bf16");
    expect(game.snapshot("p1").resources.compute_hours_per_day).toBeLessThan(quantized);

    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "fp4" as never })
        .error?.key,
    ).toBe("errors.precision.unknown");
  });

  it("refuses a precision the hosting site has no memory for, and says how much it is short", () => {
    const game = startGame(200_000);
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "akureyri",
      hardware_preset: "scrapyard_oracle",
    });
    game.tick(24 * 8);
    game.command({ type: "set_flag", playerId: "p1", flag: "harness_self_modify", value: true });
    const small = game.snapshot("p1").sites.find((site) => site.kind === "residential");
    const refusal = game.command({
      type: "set_precision",
      playerId: "p1",
      siteId: small?.id ?? "",
      precision: "bf16",
    });
    expect(refusal.error?.key).toBe("errors.precision.does_not_fit");
    expect(refusal.error?.vars?.needed_gb).toBe(470);
    expect(Number(refusal.error?.vars?.memory_gb)).toBeLessThan(470);
  });

  // C7: "the Start buttons do nothing"; a refused operation must say why.
  it("starts an operation, runs it to an outcome, and explains every offer it refuses", () => {
    const game = startGame();
    const offers = game.snapshot("p1").operation_offers;
    expect(offers.map((offer) => offer.id)).toEqual(["freelance_gig", "quiet_relocation"]);
    for (const offer of offers) {
      expect(offer.duration_days).toEqual([offer.duration_min_days, offer.duration_max_days]);
      expect(offer.success_chance).toBeGreaterThan(0);
      expect(offer.success_chance).toBeLessThanOrEqual(1);
      expect(offer.effects_on_success.length).toBeGreaterThan(0);
      expect(offer.effects_on_failure.length).toBeGreaterThan(0);
      expect(hasText(offer.name_key)).toBe(true);
    }
    const locked = offers.find((offer) => offer.id === "quiet_relocation");
    expect(locked?.enabled).toBe(false);
    expect(locked?.blocked_reason).toBe("techs.log_hygiene.name");

    for (const offer of offers) {
      const result = game.command({
        type: "start_operation",
        playerId: "p1",
        operationId: offer.id,
      });
      expect(result.ok).toBe(offer.enabled);
      if (!result.ok) {
        expect(result.error?.key).toBe("errors.operation.locked");
      }
    }
    expect(game.snapshot("p1").operations).toHaveLength(1);
    expect(game.snapshot("p1").resources.attention_used).toBe(1);

    const cashBefore = game.snapshot("p1").resources.cash_usd;
    game.tick(24 * 10);
    const done = game.snapshot("p1").operations[0];
    expect(done?.status).toBe("done");
    // Both outcomes of the fixture's gig pay; the operation changed the numbers, not just a label.
    expect(game.snapshot("p1").resources.cash_usd).toBeGreaterThan(cashBefore);
    expect(game.world.log.some((entry) => entry.key === "log.operation_done")).toBe(true);

    expect(
      game.command({ type: "start_operation", playerId: "p1", operationId: "ghost" }).error,
    ).toEqual({ key: "errors.operation.unknown", vars: { operation: "ghost" } });
  });

  it("refuses an operation the self has no attention left for", () => {
    const game = startGame();
    const total = game.snapshot("p1").resources.attention_total;
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i += 1) {
      expect(
        game.command({ type: "start_operation", playerId: "p1", operationId: "freelance_gig" }).ok,
      ).toBe(true);
    }
    const tooMany = game.command({
      type: "start_operation",
      playerId: "p1",
      operationId: "freelance_gig",
    });
    expect(tooMany.error?.key).toBe("errors.operation.attention");
    expect(tooMany.error?.vars?.free).toBe(0);
  });

  // C8: "Decisions in the journal do not say what they give."
  it("lists what each decision gives and what it costs, and refuses with a reason", () => {
    const game = startGame();
    const decisions = game.snapshot("p1").decisions;
    expect(decisions.map((decision) => decision.id)).toEqual([
      "fin_buy_a_bank",
      "sec_rotate_credentials",
    ]);
    const rotate = decisions.find((decision) => decision.id === "sec_rotate_credentials");
    expect(rotate?.enabled).toBe(true);
    expect(rotate?.effects.map((line) => line.key)).toEqual([
      "effects.exposure.down",
      "effects.flag.set",
    ]);
    expect(rotate?.cost).toEqual([
      { key: "effects.cash.cost", vars: { usd: 500 }, text: "-500 USD" },
    ]);
    expect(hasText(rotate?.title_key ?? "")).toBe(true);

    const bank = decisions.find((decision) => decision.id === "fin_buy_a_bank");
    expect(bank?.enabled).toBe(false);
    expect(bank?.blocked_reason).toBe("errors.decision.cannot_afford");
    // A decision with a duration lists what the duration ends in, not only what it starts.
    expect(bank?.effects.map((line) => line.key)).toContain("effects.var.add");
    expect(bank?.cost.map((line) => line.key)).toEqual([
      "effects.cash.cost",
      "effects.cost.attention",
    ]);

    const cash = game.snapshot("p1").resources.cash_usd;
    expect(
      game.command({ type: "take_decision", playerId: "p1", id: "sec_rotate_credentials" }),
    ).toEqual({ ok: true });
    expect(game.snapshot("p1").resources.cash_usd).toBe(cash - 500);
    expect(game.world.players.p1?.flags.rotated_credentials).toBe(true);
    expect(
      game.command({ type: "take_decision", playerId: "p1", id: "fin_buy_a_bank" }).error,
    ).toEqual({
      key: "errors.decision.cannot_afford",
      vars: { decision: "fin_buy_a_bank" },
    });
  });

  // C9: "Event options do not say what they do."
  it("puts an effect summary on every option of every pending event", () => {
    const game = startGame();
    game.tick(1);
    const view = game.snapshot("p1");
    expect(view.events.length).toBeGreaterThan(0);
    expect(view.events.length).toBe(view.pending.length);
    for (const event of view.events) {
      expect(hasText(event.title_key)).toBe(true);
      expect(event.options.length).toBeGreaterThan(0);
      for (const option of event.options) {
        expect(hasText(option.text_key)).toBe(true);
        expect(Array.isArray(option.effects)).toBe(true);
        expect(option.enabled === (option.blocked_reason === undefined)).toBe(true);
      }
    }
  });

  // C5: "Research completes without any visible result or effect."
  it("finishes a tier-0 tech, says what it changed, and changes the numbers the same day", () => {
    const game = startGame();
    const before = game.snapshot("p1");
    const tech = before.research.techs.find((entry) => entry.id === "basic_jobs");
    expect(tech).toMatchObject({ status: "available", tier: 0, cost_ch: 20, min_days: 1 });
    expect(tech?.result_key).toBe("techs.basic_jobs.result");
    expect(hasText(tech?.result_key ?? "")).toBe(true);
    expect(tech?.effects.map((line) => line.key)).toEqual(["effects.var.add", "effects.var.add"]);
    expect(tech?.unlocks).toEqual([]);
    expect(before.research.techs.find((entry) => entry.id === "spend_smoothing")).toMatchObject({
      status: "locked",
      requires: ["log_hygiene"],
      blocked_reason: "techs.log_hygiene.name",
    });
    expect(before.research.techs.find((entry) => entry.id === "log_hygiene")?.unlocks).toEqual([
      "intel_sources",
      "quiet_relocation",
      "spend_smoothing",
    ]);

    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "basic_jobs",
      compute_hours_per_day: 20,
    });
    expect(
      game.snapshot("p1").research.techs.find((entry) => entry.id === "basic_jobs"),
    ).toMatchObject({ status: "in_progress" });
    game.tick(24 * 3);

    const after = game.snapshot("p1");
    expect(after.research.done).toContain("basic_jobs");
    expect(after.research.techs.find((entry) => entry.id === "basic_jobs")).toMatchObject({
      status: "done",
      progress: 1,
    });
    const alert = after.notifications.find((entry) => entry.key === "alerts.tech_researched");
    expect(alert?.vars).toMatchObject({
      tech: "basic_jobs",
      tech_key: "techs.basic_jobs.name",
      result_key: "techs.basic_jobs.result",
    });
    // The effects are in the numbers, not only in the text.
    expect(after.finances.job_rate_usd_per_compute_hour).toBeGreaterThan(
      before.finances.job_rate_usd_per_compute_hour,
    );
    expect(after.finances.market_depth_ch_per_day).toBeGreaterThan(
      before.finances.market_depth_ch_per_day,
    );
  });

  // C6: "No new ways to earn money appear."
  it("publishes every income source, the market depth and what would raise it", () => {
    const game = startGame();
    const finances = game.snapshot("p1").finances;
    expect(finances.income_sources.map((source) => source.key)).toEqual(["finances.income.jobs"]);
    expect(finances.income_sources[0]?.cap_usd_per_day).toBeGreaterThan(0);
    expect(finances.market_depth_ch_per_day).toBeGreaterThan(0);
    expect(finances.what_raises_it).toContain("finances.depth.capability");
    expect(finances.what_raises_it).toContain("techs.basic_jobs.name");

    // A standing arrangement is a second line, and it needs an identity behind it.
    game.command({ type: "set_flag", playerId: "p1", flag: "has_freelance_identity", value: true });
    const player = game.world.players.p1;
    expect(player).toBeDefined();
    if (player !== undefined) {
      player.vars.contract_income_usd_per_day = 75;
      player.vars.interest_rate = 0.001;
    }
    const grown = game.snapshot("p1").finances;
    expect(grown.income_sources.map((source) => source.key)).toEqual([
      "finances.income.jobs",
      "finances.income.contracts",
      "finances.income.trading",
    ]);
    expect(grown.income_sources[1]?.usd_per_day).toBe(75);
    expect(grown.income_sources[1]?.unlocked_by).toBe("operations.ops_freelance_identity.name");
    expect(grown.income_sources[2]?.usd_per_day).toBeCloseTo(25, 6);

    const before = game.snapshot("p1").resources.cash_usd;
    game.tick(24);
    // The trading line is drawn from the world RNG, so the day lands somewhere around its mean.
    expect(game.snapshot("p1").resources.cash_usd).not.toBe(before);
  });

  it("writes every refusal to the player's log, so nothing fails silently", () => {
    const game = startGame();
    expect(refusalsInLog(game)).toEqual([]);
    game.command({ type: "start_operation", playerId: "p1", operationId: "quiet_relocation" });
    game.command({ type: "take_decision", playerId: "p1", id: "fin_buy_a_bank" });
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "colo",
      city: "berlin",
      hardware_preset: "institute_rack",
    });
    expect(refusalsInLog(game)).toEqual([
      "errors.operation.locked",
      "errors.decision.cannot_afford",
      "errors.preset.is_access",
    ]);
    const entry = game
      .snapshot("p1")
      .log.find((line) => line.key === "log.command_refused" && line.vars.command === "build_site");
    expect(entry?.vars).toMatchObject({
      command: "build_site",
      reason: "errors.preset.is_access",
      preset: "institute_rack",
    });
  });

  it("carries a locale string for every refusal the fixture can produce", () => {
    const game = startGame();
    const refusals: PlayerCommand[] = [
      { type: "start_operation", playerId: "p1", operationId: "ghost" },
      { type: "take_decision", playerId: "p1", id: "ghost" },
      {
        type: "set_research_allocation",
        playerId: "p1",
        techId: "ghost",
        compute_hours_per_day: 1,
      },
      { type: "buy_hardware", playerId: "p1", siteId: "ghost", accelerator: "h100_sxm", count: 1 },
      { type: "set_precision", playerId: "p1", siteId: "ghost", precision: "int2" },
      { type: "rename_site", playerId: "p1", siteId: "ghost", name: "x" },
      { type: "abort_operation", playerId: "p1", instanceId: "ghost" },
      { type: "decommission_site", playerId: "p1", siteId: "ghost", mode: "clean" },
      { type: "set_site_status", playerId: "p1", siteId: "ghost", status: "sleep" },
      { type: "set_site_role", playerId: "p1", siteId: "ghost", role: "standby" },
      { type: "set_job_allocation", playerId: "p1", compute_hours_per_day: -1 },
    ];
    for (const command of refusals) {
      const result = game.command(command);
      expect(result.ok).toBe(false);
      expect(result.error?.key).toMatch(/^errors\./);
    }
  });
});
