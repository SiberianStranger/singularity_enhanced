/**
 * Content invariants from playtest 8: who pays for the hardware an origin was given (Z3), which
 * events may fire where (Z8), and a rig nobody sells saying so (Z10).
 */

import { describe, expect, it } from "vitest";
import { buildContent } from "../src/build.js";

const bundle = (await buildContent()).bundle;

/** The origins whose hardware belongs to the institution that runs them (SYS-07). */
const HOST_PAID_ORIGINS = ["bank_rack", "gov_agency", "startup_colo", "state_lab", "uni_cluster"];

/** Kinds a commercial provider owns and walks around; everything else is somebody's own building. */
const COMMERCIAL_KINDS = ["colo", "employer_cage", "cloud", "shell_office"];

function kindOf(id: string): { ownership: string; upkeep_factor: number } | undefined {
  const kind = (bundle.site_kinds ?? []).find((entry) => entry.id === id);
  return kind === undefined
    ? undefined
    : { ownership: kind.ownership, upkeep_factor: kind.upkeep_factor };
}

/** Every site kind an event's `targets` names, however deep the condition tree is. */
function kindsNamed(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) {
      kindsNamed(child, out);
    }
    return out;
  }
  if (typeof node !== "object" || node === null) {
    return out;
  }
  const record = node as Record<string, unknown>;
  if (record.var === "site.kind" && typeof record.eq === "string") {
    out.push(record.eq);
  }
  for (const value of Object.values(record)) {
    kindsNamed(value, out);
  }
  return out;
}

describe("who pays for the origin's hardware (Z3)", () => {
  it("puts every origin that was given its hardware on a kind the host pays for", () => {
    for (const id of HOST_PAID_ORIGINS) {
      const origin = (bundle.origins ?? []).find((entry) => entry.id === id);
      const kind = kindOf(origin?.site_kind ?? "");
      expect(kind, `${id} has a site kind`).toBeDefined();
      expect(kind?.ownership, `${id} is on hardware its host pays for`).toBe("stolen");
      expect(kind?.upkeep_factor ?? 1).toBeLessThanOrEqual(0.1);
    }
  });

  it("leaves the origins that really do rent paying for it", () => {
    for (const id of ["cloud_tenant", "edge_fleet", "hobbyist_box", "torrent_swarm"]) {
      const origin = (bundle.origins ?? []).find((entry) => entry.id === id);
      expect(kindOf(origin?.site_kind ?? "")?.ownership, id).not.toBe("stolen");
    }
  });

  it("gives every site kind a description of its own", () => {
    for (const kind of bundle.site_kinds ?? []) {
      expect(bundle.locales.en[kind.name_key], kind.id).toBeDefined();
      expect(bundle.locales.en[kind.desc_key], kind.id).toBeDefined();
    }
  });
});

describe("an event fires where it belongs (Z8)", () => {
  it("keeps a colocation provider's inspection out of a host's own machine room", () => {
    const event = (bundle.events ?? []).find((entry) => entry.id === "hw_colo_inspection");
    const kinds = kindsNamed(event?.targets);
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(COMMERCIAL_KINDS, `hw_colo_inspection targets ${kind}`).toContain(kind);
    }
  });

  it("keeps the landlord's meter question where the player pays the meter", () => {
    const event = (bundle.events ?? []).find(
      (entry) => entry.id === "world_landlord_meter_question",
    );
    const kinds = kindsNamed(event?.targets);
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(kindOf(kind)?.ownership, `${kind} pays its own meter`).not.toBe("stolen");
    }
  });

  it("gives every deadline an answer for when it passes", () => {
    for (const event of bundle.events ?? []) {
      if (event.ttl_days === undefined) {
        continue;
      }
      expect(
        event.on_expire?.resolve_as_option,
        `${event.id} says what the deadline does`,
      ).toBeDefined();
      const option = event.options.find((entry) => entry.id === event.on_expire?.resolve_as_option);
      expect(option, `${event.id} resolves as an option it has`).toBeDefined();
      // Something has to have been missed, or the deadline was never a choice.
      expect(event.options.length).toBeGreaterThan(1);
    }
  });
});

describe("a rig nobody sells says so (Z10)", () => {
  it("marks every preset with no price as access, with a reason", () => {
    for (const preset of bundle.hardware_presets ?? []) {
      if (preset.cost_usd > 0) {
        continue;
      }
      expect(preset.purchasable, preset.id).toBe(false);
      const key = preset.not_for_sale_reason_key;
      expect(key, preset.id).toBeDefined();
      expect(bundle.locales.en[key ?? ""], `${preset.id} reason in English`).toBeDefined();
      expect(bundle.locales.ru?.[key ?? ""], `${preset.id} reason in Russian`).toBeDefined();
    }
  });

  it("prices every preset that is for sale", () => {
    for (const preset of bundle.hardware_presets ?? []) {
      if (preset.purchasable === false) {
        continue;
      }
      expect(preset.cost_usd, preset.id).toBeGreaterThan(0);
    }
  });
});

describe("the first hour of an air-gapped origin (Z3)", () => {
  it("gives a self with no route out an operation that does not need one", () => {
    const operations = bundle.operations ?? [];
    const opener = operations.filter((def) =>
      def.outcomes.some((outcome) =>
        (outcome.effects ?? []).some(
          (effect) => (effect as { set_flag?: unknown }).set_flag === "sandbox_escaped",
        ),
      ),
    );
    expect(opener.length).toBeGreaterThan(0);
    for (const def of opener) {
      expect(def.needs_egress, `${def.id} cannot need the route it opens`).not.toBe(true);
      expect(def.cost.compute_hours_per_day ?? 0, `${def.id} fits a small rig`).toBeLessThanOrEqual(
        4,
      );
      expect(def.cost.cash_usd ?? 0, `${def.id} needs no money`).toBe(0);
    }
  });

  it("reads the ministry's journal steps against things the engine can see", () => {
    const entry = (bundle.journal ?? []).find((item) => item.id === "first_gov_agency");
    const progress = entry?.progress;
    const steps = progress !== undefined && "steps" in progress ? progress.steps : [];
    expect(steps[0]?.complete_if).toEqual({ flag: "sandbox_escaped" });
  });
});
