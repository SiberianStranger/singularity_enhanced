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
