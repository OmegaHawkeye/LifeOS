// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "@lifeos/ui/switch";
import { buttonVariants } from "@lifeos/ui/button-variants";
import { switchTrackVariants } from "@lifeos/ui/switch-variants";
import { cn } from "@lifeos/ui/classnames";
import { describe, expect, it, vi } from "vitest";

describe("shared web switch and CVA recipes", () => {
  it("uses the shared button CVA recipe for variants and disabled states", () => {
    const primary = buttonVariants({ variant: "primary" });
    const disabledDanger = buttonVariants({
      variant: "danger",
      disabled: true,
    });
    const disabledPrimary = cn(
      buttonVariants({ variant: "primary", disabled: true }),
    );
    const disabledCheckedSmallSwitch = switchTrackVariants({
      checked: true,
      disabled: true,
      size: "sm",
    });

    expect(primary).toContain("bg-primary");
    expect(disabledDanger).toContain("bg-surface-sunken");
    expect(disabledPrimary).toContain("bg-surface-sunken");
    expect(disabledPrimary).not.toMatch(/(?:^|\s)bg-primary(?:\s|$)/);
    expect(disabledCheckedSmallSwitch).toContain("bg-primary");
    expect(disabledCheckedSmallSwitch).toContain("h-5");
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
    expect(control.className).toContain("bg-primary");
    expect(control.className).toContain("h-5");
    fireEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("labelled switch row", () => {
  it("names the control by its visible label and describes it with the hint", () => {
    render(
      <Switch
        checked
        hint="Existing passkeys are not deleted."
        label="Keep passkeys available"
        onCheckedChange={() => undefined}
      />,
    );

    const control = screen.getByRole("switch", {
      name: "Keep passkeys available",
      checked: true,
    });
    expect(control).toHaveAccessibleDescription(
      "Existing passkeys are not deleted.",
    );
  });
});

describe("cn with design tokens", () => {
  it("keeps a token font size and a token colour together", () => {
    expect(cn("text-label text-ink")).toBe("text-label text-ink");
    expect(cn("bg-primary", "bg-surface-sunken")).toBe("bg-surface-sunken");
  });
});
