import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "../src/components/Slider.js";

describe("slider", () => {
  it("snaps simulation figures onto the step grid so the top of the range is reachable", () => {
    // A site producing 54.432 CH/day with a whole-hour step: without snapping, the browser rejects
    // every value and the player can never allocate their whole capacity.
    const onChange = vi.fn();
    render(<Slider label="Freelance work" min={0} max={54.432} value={0} onChange={onChange} />);
    const input = screen.getByRole("slider", { name: "Freelance work" });
    expect(input).toHaveAttribute("max", "54");
    expect(input).toHaveAttribute("min", "0");
    // The control is a controlled input, so the point is that the browser accepts the top value.
    fireEvent.change(input, { target: { value: "54" } });
    expect(onChange).toHaveBeenCalledWith(54);
  });

  it("clamps a value that is above the snapped maximum", () => {
    render(<Slider label="Jobs" min={0} max={9.8} value={9.8} onChange={() => undefined} />);
    expect(screen.getByRole("slider", { name: "Jobs" })).toHaveValue("9");
  });

  it("reports the value the player picked", () => {
    const onChange = vi.fn();
    render(<Slider label="Jobs" min={0} max={10} value={0} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider", { name: "Jobs" }), { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
