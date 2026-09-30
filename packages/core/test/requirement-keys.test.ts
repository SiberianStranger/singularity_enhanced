/**
 * What a requirement says when it fails (SYS-12 `blocked_by`, SYS-17 operation offers; 0.3.1).
 *
 * A list prints the keys it is given as they are, so every key an offer or an option can carry has
 * to read whole: a price gate is `requirements.cash`, not the path it reads, a missing tool is the
 * tool's name, and the two families that carry an id (a flag, a capability) say which one.
 */

import { describe, expect, it } from "vitest";
import { createGame } from "../src/index.js";
import { requirementKeysOf } from "../src/requirements.js";
import { instituteSetup, m1Content } from "./fixtures/m1/index.js";

describe("requirement keys", () => {
  it("lists every leaf a condition can fail on, without evaluating it", () => {
    expect(
      requirementKeysOf({
        all: [
          { var: "player.cash", gte: 400 },
          { not: { flag: "relay_prepaid" } },
          { any: [{ tech: "exploit_discovery" }, { flag: "has_shell_company" }] },
          { capability: "cyber", gte: 5 },
          { var: "player.vars.standby_copies", gte: 1 },
          { var: "player.cash", gte: 1000 },
        ],
      }),
    ).toEqual([
      "requirements.cash",
      "requirements.not",
      "techs.exploit_discovery.name",
      "requirements.flag.has_shell_company",
      "requirements.capability.cyber",
      "requirements.var.player.vars.standby_copies",
    ]);
    expect(requirementKeysOf(undefined)).toEqual([]);
  });

  it("keeps a cash condition that is not a price on its own key", () => {
    expect(requirementKeysOf({ var: "player.cash", lt: 100 })).toEqual([
      "requirements.var.player.cash",
    ]);
  });

  it("gives an offer reasons a list can print without the numbers a refusal carries", () => {
    const setup = instituteSetup({ seed: "requirement-keys" });
    setup.debug = true;
    const game = createGame({ content: m1Content, setup });
    // Spend the attention, then look at what the offers say.
    const total = game.snapshot("p1").resources.attention_total;
    for (let i = 0; i < total; i += 1) {
      game.command({ type: "start_operation", playerId: "p1", operationId: "freelance_gig" });
    }
    const reasons = game.snapshot("p1").operation_offers.flatMap((offer) => offer.blocked_by);
    expect(reasons).toContain("requirements.attention");
    for (const key of reasons) {
      // The command's own refusal sentences want an operation, a tool and the numbers; a list has
      // none of them, so none of those keys may appear here.
      expect(key).not.toMatch(/^errors\.operation\.(attention|needs_tool)$|^errors\.cash\./);
    }
  });
});
