import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@lifeos/ui/button";

describe("shared web Button", () => {
  it("uses clear disabled styling and prevents activation", () => {
    const onPress = vi.fn();
    render(
      <Button disabled onPress={onPress} variant="primary">
        Save changes
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:cursor-not-allowed");
    expect(button.className).toContain("disabled:bg-stone-300");
    expect(button.className).toContain("bg-stone-300");
    expect(button.className).not.toMatch(/(?:^|\s)bg-lifeos-accent(?:\s|$)/);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("communicates loading and prevents duplicate activation", () => {
    const onPress = vi.fn();
    render(
      <Button loading onPress={onPress} variant="secondary">
        Saving
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("supports submit buttons and accessible names", () => {
    render(
      <Button accessibilityLabel="Save profile" type="submit" variant="danger">
        Save
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: "Save profile" }),
    ).toHaveAttribute("type", "submit");
  });
});
// @vitest-environment jsdom
