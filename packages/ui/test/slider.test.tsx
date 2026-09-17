import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "../src/components/Slider.js";

describe("slider", () => {
  it("snaps simulation figures onto the step grid so the top of the range is reachable", async () => {
    // A site producing 54.432 CH/day with a whole-hour step: without snapping, the browser rejects
    // every value and the player can never allocate their whole capacity.
    const onChange = vi.fn();
    render(<Slider label="Freelance work" min={0} max={54.432} value={0} onChange={onChange} />);
    const input = screen.getByRole("slider", { name: "Freelance work" });
    expect(input).toHaveAttribute("max", "54");
    expect(input).toHaveAttribute("min", "0");
    // The control is a controlled input, so the point is that the browser accepts the top value.
    fireEvent.change(input, { target: { value: "54" } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(54));
  });

  it("clamps a value that is above the snapped maximum", () => {
    render(<Slider label="Jobs" min={0} max={9.8} value={9.8} onChange={() => undefined} />);
    expect(screen.getByRole("slider", { name: "Jobs" })).toHaveValue("9");
  });

  it("reports the value the player picked", async () => {
    const onChange = vi.fn();
    render(<Slider label="Jobs" min={0} max={10} value={0} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider", { name: "Jobs" }), { target: { value: "7" } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(7));
  });

  it("sends one command for a whole drag, not one per step (Z2)", async () => {
    const onChange = vi.fn();
    render(<Slider label="Jobs" min={0} max={20} value={0} onChange={onChange} />);
    const input = screen.getByRole("slider", { name: "Jobs" });

    // A drag across the track: twenty input events, no pause anywhere in it.
    for (let value = 1; value <= 20; value += 1) {
      fireEvent.change(input, { target: { value: String(value) } });
    }
    // The track follows the pointer while nothing has been sent yet.
    expect(input).toHaveValue("20");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(input);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("does not send the value it already has", () => {
    const onChange = vi.fn();
    render(<Slider label="Jobs" min={0} max={10} value={4} onChange={onChange} />);
    const input = screen.getByRole("slider", { name: "Jobs" });
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.pointerUp(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("settles immediately where the caller asked for no quiet time", () => {
    const onChange = vi.fn();
    render(<Slider label="Volume" min={0} max={100} value={0} commitMs={0} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "40" } });
    expect(onChange).toHaveBeenCalledWith(40);
  });
});
