import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { cityTags, government, kycStrength, stance } from "../src/derive.js";
import { outputPaths } from "../src/paths.js";
import { readWorld } from "../src/read.js";

describe("world data", () => {
  it("is exactly what the generator writes", async () => {
    const files = await readWorld();
    for (const [name, path] of Object.entries(outputPaths)) {
      const committed = await readFile(path, "utf8");
      expect(
        committed,
        `${path} is out of date: run pnpm --filter @singularity/world-data start`,
      ).toBe(files[name as keyof typeof outputPaths]);
    }
  });

  it("tags a city from the baseline's own words", () => {
    expect(cityTags("Google and Azure cloud regions")).toEqual(["datacenter_hub", "tech"]);
    expect(cityTags("capital, government")).toEqual(["government"]);
    expect(cityTags("somewhere with nothing in it")).toEqual(["urban"]);
  });

  it("reads a government out of the regime type and the freedom status", () => {
    const base = {
      iso2: "XX",
      government_type: "republic",
      democracy_regime_type: "Flawed democracy",
      freedom_house_status: "Free",
    };
    expect(government({ ...base } as never)).toBe("liberal_democracy");
    expect(government({ ...base, freedom_house_status: "Partly Free" } as never)).toBe(
      "illiberal_democracy",
    );
    expect(
      government({
        ...base,
        democracy_regime_type: "Authoritarian",
        government_type: "one-party socialist republic",
      } as never),
    ).toBe("one_party");
    expect(
      government({
        ...base,
        democracy_regime_type: "Authoritarian",
        government_type: "absolute monarchy",
      } as never),
    ).toBe("monarchy");
  });

  it("reads a stance out of the policy posture", () => {
    expect(stance({ ai_policy_posture: "eu_ai_act_first_mover" } as never)).toBe("regulate");
    expect(stance({ ai_policy_posture: "state_directed_heavy_regulation" } as never)).toBe(
      "securitize",
    );
    expect(stance({ ai_policy_posture: "sovereign_ai_megaproject" } as never)).toBe("accelerate");
    expect(stance({ ai_policy_posture: "no_framework" } as never)).toBe("ignore");
  });

  it("puts a sanctioned state below a rich one on identity checks", () => {
    const rich = kycStrength({
      iso2: "DE",
      gdp_per_capita_usd_2025: 55000,
      agencies: { financial_intel: "FIU" },
      ai_policy_posture: "eu_ai_act",
      government_type: "federal republic",
    } as never);
    const sanctioned = kycStrength({
      iso2: "XX",
      gdp_per_capita_usd_2025: 5000,
      agencies: {},
      ai_policy_posture: "sanctioned_no_framework",
      government_type: "republic",
    } as never);
    expect(rich).toBeGreaterThan(sanctioned);
    expect(sanctioned).toBeGreaterThanOrEqual(0.05);
  });
});
