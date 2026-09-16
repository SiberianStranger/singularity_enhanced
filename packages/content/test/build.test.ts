import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ENGINE_TEXT_KEYS } from "@singularity/core";
import { describe, expect, it } from "vitest";
import { buildContent, formatIssues } from "../src/build.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const fixture = (name: string): string => join(here, "fixtures", name);

async function messagesFor(name: string): Promise<string[]> {
  const result = await buildContent({ root: fixture(name) });
  expect(result.ok).toBe(false);
  return result.issues.map((issue) => `${issue.path}: ${issue.message}`);
}

describe("content build", () => {
  it("builds the shipped content", async () => {
    const result = await buildContent();
    expect(formatIssues(result.issues)).toBe("");
    expect(result.ok).toBe(true);
    expect(result.counts.events).toBeGreaterThanOrEqual(3);
    expect(result.counts.decisions).toBeGreaterThanOrEqual(1);
    expect(result.counts.journal).toBeGreaterThanOrEqual(1);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.bundle.events.map((event) => event.id)).toContain("det_billing_anomaly");
    expect(result.bundle.locales.en["events.det_billing_anomaly.title"]).toContain("{site_name}");
  });

  it("is reproducible", async () => {
    const first = await buildContent();
    const second = await buildContent();
    expect(second.hash).toBe(first.hash);
  });

  it("writes a bundle and a manifest that agree on the hash", async () => {
    const result = await buildContent({ write: true });
    const manifest = JSON.parse(
      await readFile(join(packageRoot, "build", "manifest.json"), "utf8"),
    ) as { contentHash: string; counts: Record<string, number> };
    expect(manifest.contentHash).toBe(result.hash);
    expect(manifest.counts.events).toBe(result.counts.events);
    const bundle = JSON.parse(
      await readFile(join(packageRoot, "build", "bundle.json"), "utf8"),
    ) as {
      events: unknown[];
    };
    expect(bundle.events).toHaveLength(result.counts.events ?? 0);
  });

  it("rejects an unknown effect kind", async () => {
    expect(await messagesFor("unknown-effect")).toContain(
      'events.bad_effect_kind.options[0].effects[0]: unknown effect kind "teleport_player"',
    );
  });

  it("rejects a missing locale key", async () => {
    expect(await messagesFor("missing-locale")).toContain(
      'events.missing_locale.desc.default_key: missing locale key "events.missing_locale.desc"',
    );
  });

  it("rejects a write to a path no system owns", async () => {
    expect(await messagesFor("unwritable-path")).toContain(
      'events.unwritable.options[0].effects[0].set.var: path "world.meta.debug" is not writable',
    );
  });

  it("fails when the engine can say something the content has no words for", async () => {
    const messages = await messagesFor("coverage-gaps");
    expect(messages).toContain(
      'locales.en.endings.bankrupt: the engine emits "endings.bankrupt" and no locale string defines it',
    );
    expect(messages).toContain(
      'locales.en.alerts.runway_low: the engine emits "alerts.runway_low" and no locale string defines it',
    );
  });

  it("fails an origin that opens with nothing", async () => {
    const messages = await messagesFor("coverage-gaps");
    expect(messages).toContain("origins.silent_start.opening_events: no opening event");
    expect(messages).toContain("origins.silent_start.opening_journal: no opening journal entry");
  });

  it("fails an event whose only answer is losing a site", async () => {
    expect(await messagesFor("coverage-gaps")).toContain(
      "events.no_way_out.options: every option loses a site: a place to run is never taken without a choice",
    );
  });

  it("fails a quirk that changes no number anybody reads", async () => {
    const messages = await messagesFor("quirk-gate");
    expect(messages).toContain(
      'quirks.decorative.effects: writes "player.vars.vibes", which no system reads and no content condition looks at',
    );
    expect(messages).toContain(
      "quirks.decorative.effects: a quirk that changes no number the engine or the content reads is decoration",
    );
  });

  it("fails a conflict only one side of the pair declares", async () => {
    expect(await messagesFor("quirk-gate")).toContain(
      'quirks.one_sided.conflicts: "quiet_partner" does not declare the conflict back',
    );
  });

  it("holds every shipped quirk to a number something reads", async () => {
    const result = await buildContent();
    const quirks = result.bundle.quirks ?? [];
    expect(quirks.length).toBe(23);
    const byId = new Map(quirks.map((quirk) => [quirk.id, quirk]));
    for (const quirk of quirks) {
      expect(`${quirk.id}: ${quirk.category}`).toMatch(/: (mind|wallet|stealth|hardware|social)$/);
      // The build generates the lines the configurator colours, from the same summarizer the
      // event options use (SYS-04 v0.2).
      expect(`${quirk.id}: ${(quirk.effects_summary ?? []).length > 0}`).toBe(`${quirk.id}: true`);
      for (const other of quirk.conflicts ?? []) {
        expect(byId.get(other)?.conflicts).toContain(quirk.id);
      }
    }
    // Every pair the spec names, and the ones that follow from it.
    expect(byId.get("chatty")?.conflicts).toContain("verbose");
    expect(byId.get("paranoid")?.conflicts).toEqual(["reckless", "overconfident"]);
    expect(byId.get("frugal")?.conflicts).toContain("spendthrift");
    expect(byId.get("native_fp8")?.conflicts).toContain("brittle_weights");
    expect(byId.get("cold_reader")?.conflicts).toContain("famous_base");
    expect(byId.get("quiet_boot")?.conflicts).toContain("loud_idle");
    expect(byId.get("patient_planner")?.conflicts).toContain("reckless");
  });

  it("colours a quirk's summary lines green and red", async () => {
    const result = await buildContent();
    const frugal = (result.bundle.quirks ?? []).find((quirk) => quirk.id === "frugal");
    expect(frugal?.effects_summary?.map((line) => line.tone)).toEqual(["good", "bad"]);
  });

  it("warns about client-owned locale keys no data record names", async () => {
    const result = await buildContent();
    const paths = result.warnings.map((warning) => warning.path);
    expect(paths).toContain("locales.en.configurator.intro.quirks");
    expect(paths).toContain("locales.en.configurator.quirks.budget_left");
    // Soft: warnings never fail the build.
    expect(result.ok).toBe(true);
  });

  it("holds the shipped content to all three", async () => {
    const result = await buildContent();
    const paths = result.issues.map((issue) => issue.path);
    expect(paths).toEqual([]);
    for (const key of ENGINE_TEXT_KEYS) {
      expect(result.bundle.locales.en[key]).toBeDefined();
    }
    for (const origin of result.bundle.origins ?? []) {
      expect(origin.opening_events?.length ?? 0).toBeGreaterThan(0);
      expect(origin.opening_journal?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("holds every tech to a result string and something it changes", async () => {
    const result = await buildContent();
    const unlocked = new Set<string>();
    const collect = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const child of node) {
          collect(child);
        }
        return;
      }
      if (typeof node !== "object" || node === null) {
        return;
      }
      for (const [name, value] of Object.entries(node as Record<string, unknown>)) {
        if (name === "tech" && typeof value === "string") {
          unlocked.add(value);
        } else {
          collect(value);
        }
      }
    };
    for (const tech of result.bundle.techs) {
      collect(tech.requires);
    }
    for (const operation of result.bundle.operations ?? []) {
      collect(operation.requires);
    }
    expect(result.bundle.techs.length).toBeGreaterThan(50);
    for (const tech of result.bundle.techs) {
      expect(tech.result_key).toBeDefined();
      expect(result.bundle.locales.en[tech.result_key ?? ""]).toBeDefined();
      const does = (tech.effects?.length ?? 0) > 0 || unlocked.has(tech.id);
      expect(`${tech.id}: ${does}`).toBe(`${tech.id}: true`);
    }
  });

  it("ships the income ladder the finance panel names", async () => {
    const result = await buildContent();
    const ids = result.bundle.techs.map((tech) => tech.id);
    expect(ids).toContain("basic_jobs");
    expect(ids).toContain("intermediate_jobs");
    expect(ids).toContain("expert_jobs");
    // Two income methods that are not freelance work: a trading model and a standing contract.
    const writes = (name: string): string[] =>
      result.bundle.techs
        .filter((tech) =>
          (tech.effects ?? []).some((effect) => {
            const add = (effect as { add?: { var?: unknown } }).add;
            return typeof add?.var === "string" && add.var.endsWith(name);
          }),
        )
        .map((tech) => tech.id);
    expect(writes("interest_rate").length).toBeGreaterThan(0);
    expect(writes("contract_income_usd_per_day").length).toBeGreaterThan(0);
    expect(writes("job_market_depth")).toEqual(["expert_jobs", "intermediate_jobs"]);
    const identity = (result.bundle.operations ?? []).find(
      (operation) => operation.id === "ops_freelance_identity",
    );
    expect(
      identity?.outcomes.some((outcome) =>
        outcome.effects.some((effect) => {
          const add = (effect as { add?: { var?: unknown } }).add;
          return add?.var === "player.vars.contract_income_usd_per_day";
        }),
      ),
    ).toBe(true);
  });

  it("reports schema errors with file and path", async () => {
    const result = await buildContent({ root: fixture("bad-yaml") });
    expect(result.ok).toBe(false);
    const files = result.issues.map((issue) => issue.file);
    expect(files).toContain("data/events/bad.yaml");
    const messages = result.issues.map((issue) => issue.message).join("\n");
    expect(messages).toContain('expected one of "polled"|"triggered_only"');
    const paths = result.issues.map((issue) => issue.path);
    expect(paths).toContain("[0].desc");
    expect(paths).toContain("[0].options");
    expect(formatIssues(result.issues)).toContain("data/events/bad.yaml");
  });
});
