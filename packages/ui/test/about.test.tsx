/**
 * The About window's line on the map's control layer over Ukraine. The map carries no text about
 * the layer, so this is where its date, its sources and what it is not are said (control room,
 * map review 2026-09-30).
 */

import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { afterAll, describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { CONTROL_BASELINE_DATE } from "../src/screens/game/map/ukraine-control.js";
import { AboutBody } from "../src/screens/menu/AboutDialog.js";

describe("the About window's line on the control layer", () => {
  afterAll(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });

  it("dates the layer by its baseline and names the assessments it was drawn from", async () => {
    await i18next.changeLanguage("en");
    expect(CONTROL_BASELINE_DATE).toBe("2026-09-28");
    render(<AboutBody />);
    const line = screen.getByTestId("about-control-layer");
    expect(line).toHaveTextContent("September 28, 2026");
    expect(line).toHaveTextContent("Institute for the Study of War");
    expect(line).toHaveTextContent("Critical Threats Project");
    expect(line).toHaveTextContent("Crimea and the rest of Ukraine are Ukraine");
  });

  it("gives the same date in Russian", async () => {
    await i18next.changeLanguage("ru");
    render(<AboutBody />);
    expect(screen.getByTestId("about-control-layer")).toHaveTextContent("28 сентября 2026");
  });
});
