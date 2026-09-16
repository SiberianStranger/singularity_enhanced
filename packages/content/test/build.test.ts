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
