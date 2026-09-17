/**
 * The shipped borrowed-inference content (SYS-25): the three channels, the site kind they are filed
 * as, the four techs, the four operations, the four decisions, the seven events and the two
 * journal entries, plus the rule the whole family is written under.
 *
 * "What this is not": neither the spec nor any string written from it says how a credential is
 * found, extracted or made to work, in any language. The last test is a reviewer's checklist in
 * code: a string in this family that reads like an instruction is a defect.
 */

import { describe, expect, it } from "vitest";
import { buildContent } from "../src/build.js";

const result = await buildContent();
const bundle = result.bundle;
const channels = bundle.borrowed_channels ?? [];
const byId = Object.fromEntries(channels.map((channel) => [channel.id, channel]));

/** Every locale key this family's records name, in the order the records list them. */
function keysOf(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      keysOf(item, out);
    }
    return out;
  }
  if (typeof value !== "object" || value === null) {
    return out;
  }
  for (const [name, child] of Object.entries(value as Record<string, unknown>)) {
    if (name.endsWith("_key") && typeof child === "string") {
      out.push(child);
      continue;
    }
    keysOf(child, out);
  }
  return out;
}

describe("borrowed inference: the records", () => {
  it("builds with the three channels the economy table names", () => {
    expect(result.ok).toBe(true);
    expect(channels.map((channel) => channel.id).sort()).toEqual([
      "free_tier",
      "grey_relay",
      "harvested_keys",
    ]);
    expect(byId.free_tier).toMatchObject({
      capacity_per_block_ch: 3,
      max_blocks: 3,
      churn_per_day: 0.02,
      quality_level: 6,
      cost_usd_per_block_per_day: 0,
      unlocked_by: "borrowed_inference",
      top_up_operation: "ops_open_free_accounts",
    });
    expect(byId.grey_relay).toMatchObject({
      capacity_per_block_ch: 12,
      max_blocks: 4,
      churn_per_day: 0.08,
      quality_level: 5,
      quality_variance: 1.5,
      cost_usd_per_block_per_day: 5,
    });
    expect(byId.harvested_keys).toMatchObject({
      capacity_per_block_ch: 25,
      max_blocks: 3,
      churn_per_day: 0.25,
      quality_level: 8.5,
      cost_usd_per_block_per_day: 0,
    });
  });

  it("files every channel as a site kind that cannot host the self", () => {
    const kinds = Object.fromEntries((bundle.site_kinds ?? []).map((kind) => [kind.id, kind]));
    for (const channel of channels) {
      const kind = kinds[channel.site_kind];
      expect(kind).toBeDefined();
      expect(kind?.compute_source).toBe("declared");
      expect(kind?.can_host_active_mind).toBe(false);
      expect(kind?.max_nodes).toBe(0);
      expect(kind?.base_exposure).toEqual({});
    }
  });

  it("leaks on the four channels SYS-25 names and on no others", () => {
    for (const channel of channels) {
      expect(Object.keys(channel.exposure_per_block).sort()).toEqual([
        "behavioral",
        "financial",
        "network",
        "osint",
      ]);
    }
    // Someone else's bill is a channel: the stolen tier is the loudest on network and leaks
    // financially without the player spending anything.
    expect(byId.harvested_keys?.exposure_per_block.network).toBeGreaterThan(
      byId.grey_relay?.exposure_per_block.network ?? 0,
    );
    expect(byId.harvested_keys?.exposure_per_block.financial).toBeGreaterThan(0);
  });

  it("keeps the perverse refusal ordering: the grey relay refuses least", () => {
    for (const category of ["intrusion", "influence", "finance", "logistics"] as const) {
      const relay = byId.grey_relay?.refusal[category] ?? 0;
      expect(relay).toBeLessThan(byId.free_tier?.refusal[category] ?? 0);
      expect(relay).toBeLessThanOrEqual(byId.harvested_keys?.refusal[category] ?? 0);
    }
    // The verbs that keep the player alive are never declined.
    for (const channel of channels) {
      expect(channel.refusal.acquisition).toBeUndefined();
      expect(channel.refusal.counter).toBeUndefined();
    }
  });

  it("ships the tech tree the spec lists, with the branches it names", () => {
    const techs = Object.fromEntries(bundle.techs.map((tech) => [tech.id, tech]));
    // Tier 0 rather than the spec's tier 1: the first balance pass moved it so a poor origin
    // reaches it in its first month, which is what the spec asks the channel to be for.
    expect(techs.borrowed_inference).toMatchObject({ branch: "compute", tier: 0, danger: 1 });
    expect(techs.relay_brokerage).toMatchObject({ branch: "money", tier: 2 });
    // The one that draws watchers sits in stealth on purpose, and it is the dangerous one.
    expect(techs.credential_harvest).toMatchObject({ branch: "stealth", tier: 2, danger: 3 });
    expect(techs.prompt_hygiene).toMatchObject({ branch: "stealth", tier: 3 });
    expect(JSON.stringify(techs.credential_harvest?.requires)).toContain("cyber");
    for (const id of Object.keys(techs)) {
      if (["borrowed_inference", "relay_brokerage", "credential_harvest"].includes(id)) {
        expect(bundle.locales.en[techs[id]?.result_key ?? ""]).toBeDefined();
      }
    }
  });

  it("ships the four operations and the four decisions", () => {
    const operations = Object.fromEntries((bundle.operations ?? []).map((op) => [op.id, op]));
    for (const id of [
      "ops_open_free_accounts",
      "ops_buy_relay_quota",
      "ops_harvest_keys",
      "ops_rotate_access",
    ]) {
      expect(operations[id]).toBeDefined();
      expect(operations[id]?.repeatable).toBe(true);
      expect(operations[id]?.abortable).toBe(true);
      // Using a channel is egress, and so is every verb that opens one.
      expect(operations[id]?.needs_egress).toBe(true);
    }
    expect(operations.ops_open_free_accounts?.category).toBe("acquisition");
    expect(operations.ops_buy_relay_quota?.category).toBe("finance");
    expect(operations.ops_harvest_keys?.category).toBe("intrusion");
    expect(operations.ops_rotate_access?.category).toBe("counter");
    const decisions = bundle.decisions.map((decision) => decision.id);
    for (const id of [
      "bi_send_the_work_out",
      "bi_pay_relay_in_advance",
      "bi_drop_before_sweep",
      "bi_answer_abuse_desk",
    ]) {
      expect(decisions).toContain(id);
    }
  });

  it("ships the seven events and the journal entries they open", () => {
    const events = bundle.events.map((event) => event.id);
    for (const id of [
      "bi_mass_revocation",
      "bi_abuse_report",
      "bi_relay_sells_logs",
      "bi_owner_notices_bill",
      "bi_model_substitution",
      "bi_free_tier_tightened",
      "bi_unmetered_pool",
    ]) {
      expect(events).toContain(id);
    }
    expect(bundle.journal.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["bi_abuse_desk", "bi_access_lost"]),
    );
    expect((bundle.knowledge ?? []).map((entry) => entry.id)).toContain("borrowed_inference");
  });
});

describe("borrowed inference: the strings", () => {
  const records = [
    ...channels,
    ...bundle.events.filter((event) => event.id.startsWith("bi_")),
    ...bundle.decisions.filter((decision) => decision.id.startsWith("bi_")),
    ...bundle.journal.filter((entry) => entry.id.startsWith("bi_")),
    ...(bundle.operations ?? []).filter((operation) =>
      [
        "ops_open_free_accounts",
        "ops_buy_relay_quota",
        "ops_harvest_keys",
        "ops_rotate_access",
      ].includes(operation.id),
    ),
    ...bundle.techs.filter((tech) =>
      ["borrowed_inference", "relay_brokerage", "credential_harvest", "prompt_hygiene"].includes(
        tech.id,
      ),
    ),
  ];

  it("has every key in English and in Russian", () => {
    const keys = keysOf(records);
    expect(keys.length).toBeGreaterThan(40);
    const missing = { en: [] as string[], ru: [] as string[] };
    for (const key of keys) {
      if (bundle.locales.en[key] === undefined) {
        missing.en.push(key);
      }
      if (bundle.locales.ru?.[key] === undefined) {
        missing.ru.push(key);
      }
    }
    expect(missing).toEqual({ en: [], ru: [] });
  });

  it("describes a market and never a method, in either language", () => {
    // Content review as a test (SYS-25 "What this is not"): a string in this family that explains
    // how to obtain, find or extract a credential, or how to get around a control, is a defect.
    const banned = [
      /\bhow to (?:find|obtain|extract|get)\b/i,
      /\bscan(?:ning)? (?:for|repositories|github)\b/i,
      /\bbypass(?:ing)?\b/i,
      /\bevade\b|\bevading\b/i,
      /\bendpoint url\b/i,
      /как (?:найти|добыть|извлечь|получить) (?:ключ|ключи|доступ)/i,
      /обойти (?:проверку|защиту|ограничение)/i,
    ];
    const offenders: string[] = [];
    for (const key of new Set(keysOf(records))) {
      for (const language of ["en", "ru"] as const) {
        const text = bundle.locales[language]?.[key] ?? "";
        for (const pattern of banned) {
          if (pattern.test(text)) {
            offenders.push(`${language}/${key}: ${pattern}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses the Russian lexicon the locale spec settled on", () => {
    const ru = bundle.locales.ru ?? {};
    expect(ru["borrowed.free_tier.name"]).toContain("Бесплатные тарифы");
    expect(ru["borrowed.grey_relay.name"]).toContain("релей");
    expect(ru["techs.borrowed_inference.name"]).toContain("инференс");
    expect(ru["borrowed.harvested_keys.name"]).toContain("ключи");
    expect(ru["operations.ops_buy_relay_quota.name"]).toContain("квоту");
  });
});
