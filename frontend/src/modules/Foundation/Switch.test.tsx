// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "@lifeos/ui/switch";
import { buttonVariants } from "@lifeos/ui/button-variants";
import { describe, expect, it, vi } from "vitest";

describe("shared web switch and CVA recipes", () => {
  it("uses the shared button CVA recipe for variants and disabled states", () => {
    const primary = buttonVariants({ variant: "primary" });
    const disabledDanger = buttonVariants({
      variant: "danger",
      disabled: true,
    });

    expect(primary).toContain("bg-lifeos-accent");
    expect(disabledDanger).toContain("disabled:bg-stone-300");
  });

  it("announces checked state and reports toggles accessibly", () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        accessibilityLabel="Allow passkey sign-in"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    const control = screen.getByRole("switch", {
      name: "Allow passkey sign-in",
      checked: false,
    });
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("keeps disabled styling and blocks interaction", () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        accessibilityLabel="Allow passkey sign-in"
        checked
        disabled
        onCheckedChange={onCheckedChange}
        size="sm"
      />,
    );

    const control = screen.getByRole("switch", {
      name: "Allow passkey sign-in",
      checked: true,
    });
    expect(control).toBeDisabled();
    expect(control.className).toContain("bg-lifeos-accent");
    expect(control.className).toContain("h-5");
    fireEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
