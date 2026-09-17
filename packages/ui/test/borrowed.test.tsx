/**
 * The borrowed-inference block of the Compute tab (SYS-25 "What the client still has to do").
 *
 * The channels are rendered from a fixture view rather than from a played run, because the four
 * statuses a channel can be in (`healthy`, `degraded`, `dormant`, `revoked`) do not occur in one
 * game and two of them need an event to arrive first. The fixture is a real `PlayerView` from the
 * real core with its `compute.channels` replaced, so everything around the block (the offers, the
 * decisions, the sites) is what the engine actually publishes.
 */

import type { BorrowedChannelView, PlayerView } from "@singularity/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import uiEn from "../src/locales/en.json";
import uiRu from "../src/locales/ru.json";
import { BorrowedBlock } from "../src/screens/game/tabs/BorrowedBlock.js";
import { ComputeTab } from "../src/screens/game/tabs/ComputeTab.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

/** A dotted lowercase token is what an unresolved `t("borrowed.field.blocks")` leaves on screen. */
const RAW_KEY = /(^|\s)[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}(\s|$)/;

const STRINGS: Record<string, Record<string, string>> = {
  en: { ...uiEn, ...contentBundle.locales[DEFAULT_LANGUAGE] },
  ru: { ...uiRu, ...(contentBundle.locales.ru ?? {}) },
};

let session: LocalSession | null = null;

afterEach(() => {
  session?.stop();
  session = null;
  useUiStore.setState({ primaryTab: "overview", focusId: null, overlay: null, overlayFocus: null });
});

afterAll(async () => {
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

/** One channel in a given state, over the shape the core publishes. */
function channel(overrides: Partial<BorrowedChannelView> & { id: string }): BorrowedChannelView {
  return {
    name_key: `borrowed.${overrides.id}.name`,
    desc_key: `borrowed.${overrides.id}.desc`,
    drawback_key: `borrowed.${overrides.id}.drawback`,
    site_id: `s-${overrides.id}`,
    unlocked: true,
    unlocked_by: "borrowed_inference",
    unlocked_by_key: "techs.borrowed_inference.name",
    blocks: 2,
    max_blocks: 3,
    capacity_ch_per_day: 6,
    max_capacity_ch_per_day: 9,
    churn_per_day: 0.02,
    half_life_days: 34,
    quality_level: 6,
    quality_published: 6,
    self_capability_level: 5,
    effective_factor: 1.2,
    cost_usd_per_day: 0,
    exposure_per_day: {
      network: 0.002,
      billing: 0,
      telemetry: 0,
      behavioral: 0.003,
      human: 0,
      financial: 0.002,
      osint: 0.001,
    },
    refusal: { intrusion: 0.9, influence: 0.5, finance: 0.3, research: 0.08 },
    status: "healthy",
    status_reason_key: null,
    revocation_armed: false,
    refusals_this_week: 0,
    top_up: { operation: "ops_open_free_accounts", blocked_reason_key: null },
    factor_contributions: [
      { key: "compute.explain.borrowed.quality", id: overrides.id, value: 6 },
      { key: "compute.explain.borrowed.self", value: 5 },
    ],
    ...overrides,
  };
}

/** Every status at once, plus the locked row and the armed revocation badge. */
const FIXTURE_CHANNELS: BorrowedChannelView[] = [
  channel({ id: "free_tier", status: "healthy" }),
  channel({
    id: "grey_relay",
    status: "degraded",
    status_reason_key: "borrowed.status.substituted",
    blocks: 3,
    max_blocks: 4,
    capacity_ch_per_day: 36,
    max_capacity_ch_per_day: 48,
    churn_per_day: 0.08,
    half_life_days: 8.3,
    quality_level: 3.5,
    quality_published: 5,
    effective_factor: 0.7,
    cost_usd_per_day: 15,
    refusals_this_week: 2,
    unlocked_by_key: "techs.relay_brokerage.name",
    top_up: { operation: "ops_buy_relay_quota", blocked_reason_key: null },
  }),
  channel({
    id: "harvested_keys",
    status: "revoked",
    status_reason_key: "borrowed.status.revoked",
    blocks: 0,
    capacity_ch_per_day: 0,
    max_capacity_ch_per_day: 75,
    churn_per_day: 0.25,
    half_life_days: 2.4,
    quality_level: 8.5,
    quality_published: 8.5,
    effective_factor: 1.7,
    revocation_armed: true,
    unlocked: false,
    unlocked_by: "credential_harvest",
    unlocked_by_key: "techs.credential_harvest.name",
    top_up: { operation: "ops_harvest_keys", blocked_reason_key: "errors.borrowed.locked" },
  }),
];

/** The dormant row: the tech is done, the stock is gone, and the operation can run again. */
const DORMANT = channel({
  id: "free_tier",
  status: "dormant",
  blocks: 0,
  capacity_ch_per_day: 0,
  status_reason_key: null,
});

async function fixtureView(channels: BorrowedChannelView[]): Promise<PlayerView> {
  session = await startSession();
  const view = session.view();
  return {
    ...view,
    compute: {
      ...view.compute,
      channels,
      own_ch_per_day: 20,
      borrowed_ch_per_day: 42,
      borrowed_share: 0.68,
      borrowed_share_setting: 0.5,
    },
  };
}

/** Everything the block rendered, as one string, for the raw-key and language assertions. */
function blockText(): string {
  return screen.getByTestId("borrowed-block").textContent ?? "";
}

function assertNoRawKeys(where: string): void {
  const offenders = blockText()
    .split(/\s{2,}|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && RAW_KEY.test(line) && !line.includes(" "));
  expect(offenders, `${where} shows unresolved keys`).toEqual([]);
}

describe("the borrowed block", () => {
  beforeAll(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });

  /*
   * The bundle the client hands the engine used to drop the `borrowed_channels` domain, because
   * `toContentBundle` narrows the JSON against a list and the list was written before SYS-25. A
   * dropped domain is not a missing panel: `contentIndex` reads the channels off the bundle, so the
   * whole system was inert in the browser while every test that built its own view passed.
   */
  it("publishes one channel per channel the content ships", async () => {
    session = await startSession();
    const shipped = [...(contentBundle.borrowed_channels ?? [])].map((entry) => entry.id).sort();
    expect(shipped.length, "the bundle carries the borrowed channels").toBeGreaterThan(0);
    expect(session.view().compute.channels.map((entry) => entry.id)).toEqual(shipped);
  });

  it("draws one row per channel, in the order the core published them", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    const rows = within(screen.getByTestId("borrowed-block")).getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("data-testid"))).toEqual([
      "borrowed-free_tier",
      "borrowed-grey_relay",
      "borrowed-harvested_keys",
    ]);
  });

  it("splits the day's compute-hours into own and borrowed", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    const totals = screen.getByTestId("borrowed-totals");
    expect(totals).toHaveTextContent("20 CH/day");
    expect(totals).toHaveTextContent("42 CH/day");
    expect(totals).toHaveTextContent("68%");
    expect(totals).toHaveTextContent("50%");
  });

  it("names the capacity a channel holds against the capacity it could hold", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    expect(screen.getByTestId("borrowed-capacity-free_tier")).toHaveTextContent("6 / 9");
    expect(screen.getByTestId("borrowed-capacity-grey_relay")).toHaveTextContent("36 / 48");
  });

  it("colours the worth of an hour by whether it is an upgrade", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    const better = screen.getByTestId("borrowed-factor-free_tier");
    const worse = screen.getByTestId("borrowed-factor-grey_relay");
    expect(better).toHaveTextContent("1.20x");
    expect(better.querySelector(".text-ok")).not.toBeNull();
    expect(worse).toHaveTextContent("0.70x");
    expect(worse.querySelector(".text-crit")).not.toBeNull();
  });

  it("greys a locked channel and names the tech that opens it", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    const locked = screen.getByTestId("borrowed-harvested_keys");
    expect(locked).toHaveAttribute("data-unlocked", "false");
    expect(locked.className).toContain("opacity-60");
    expect(locked).toHaveTextContent(STRINGS.en?.["techs.credential_harvest.name"] ?? "");
    expect(within(locked).getByRole("button")).toBeDisabled();
  });

  it("badges a channel with a revocation armed against it", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    expect(screen.getByTestId("borrowed-armed-harvested_keys")).toBeInTheDocument();
    expect(screen.queryByTestId("borrowed-armed-free_tier")).toBeNull();
  });

  it("reads a channel at zero blocks as dormant rather than gone", async () => {
    render(<BorrowedBlock view={await fixtureView([DORMANT])} />);
    const row = screen.getByTestId("borrowed-free_tier");
    expect(row).toHaveAttribute("data-status", "dormant");
    expect(row).toHaveTextContent(STRINGS.en?.["borrowed.status.dormant"] ?? "");
    expect(row).toHaveAttribute("data-unlocked", "true");
  });

  it("shows every status with a word of its own and no raw key", async () => {
    const all: BorrowedChannelView[] = [
      ...FIXTURE_CHANNELS,
      channel({ id: "dormant_channel", status: "dormant", blocks: 0, capacity_ch_per_day: 0 }),
    ];
    render(<BorrowedBlock view={await fixtureView(all)} />);
    for (const status of ["healthy", "degraded", "dormant"] as const) {
      expect(blockText()).toContain(STRINGS.en?.[`borrowed.status.${status}`] ?? "");
    }
    expect(blockText()).toContain(STRINGS.en?.["borrowed.status.revoked_label"] ?? "");
    assertNoRawKeys("the block in English");
  });

  it("links the standing work-share decision to its card in the journal", async () => {
    const view = await fixtureView(FIXTURE_CHANNELS);
    const withDecision: PlayerView = {
      ...view,
      decisions: [
        ...view.decisions,
        {
          id: "bi_send_the_work_out",
          title_key: "decisions.bi_send_the_work_out.title",
          desc_key: "decisions.bi_send_the_work_out.desc",
          category: "research",
          enabled: true,
          cost_cash_usd: 0,
          cost_attention: 0,
          cooldown_until_tick: null,
          in_progress_until_tick: null,
          effects: [],
          cost: [],
        },
      ],
    };
    render(<BorrowedBlock view={withDecision} />);
    const title = STRINGS.en?.["decisions.bi_send_the_work_out.title"] ?? "";
    await userEvent.click(screen.getByRole("button", { name: title }));
    expect(useUiStore.getState().primaryTab).toBe("journal");
    expect(useUiStore.getState().focusId).toBe("bi_send_the_work_out");
  });

  it("opens the knowledge entry on borrowed inference", async () => {
    render(<BorrowedBlock view={await fixtureView(FIXTURE_CHANNELS)} />);
    await userEvent.click(
      screen.getByRole("button", { name: STRINGS.en?.["borrowed.knowledge"] ?? "" }),
    );
    expect(useUiStore.getState().overlay).toBe("knowledge");
    expect(useUiStore.getState().overlayFocus).toBe("borrowed_inference");
  });

  it("sits in the Compute tab under the sites table", async () => {
    const view = await fixtureView(FIXTURE_CHANNELS);
    render(<ComputeTab view={view} />);
    const block = screen.getByTestId("borrowed-block");
    const table = screen.getAllByRole("table")[0] as HTMLElement;
    expect(table.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The channels are never rows of the sites table: a channel is not a place (SYS-25).
    expect(within(table).queryByText(STRINGS.en?.["borrowed.free_tier.name"] ?? "")).toBeNull();
  });
});

describe("the borrowed block in Russian", () => {
  beforeAll(async () => {
    await i18next.changeLanguage("ru");
  });

  afterAll(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });

  it("renders every status in Russian with no raw key and no English", async () => {
    const all: BorrowedChannelView[] = [
      ...FIXTURE_CHANNELS,
      channel({ id: "dormant_channel", status: "dormant", blocks: 0, capacity_ch_per_day: 0 }),
    ];
    render(<BorrowedBlock view={await fixtureView(all)} />);
    const text = blockText();
    for (const status of ["healthy", "degraded", "dormant"] as const) {
      expect(text).toContain(STRINGS.ru?.[`borrowed.status.${status}`] ?? "");
    }
    expect(text).toContain(STRINGS.ru?.["borrowed.status.revoked_label"] ?? "");
    expect(text).toContain(STRINGS.ru?.["borrowed.panel.title"] ?? "");
    expect(/[А-Яа-яЁё]/.test(text), "the block shows Cyrillic").toBe(true);
    assertNoRawKeys("the block in Russian");

    // The English of the same keys is not on a Russian screen (SYS-14).
    for (const key of ["borrowed.panel.title", "borrowed.total.borrowed", "borrowed.armed"]) {
      const english = STRINGS.en?.[key] ?? "";
      const russian = STRINGS.ru?.[key] ?? "";
      if (english !== "" && english !== russian) {
        expect(text, `${key} leaked its English`).not.toContain(english);
      }
    }
  });
});
