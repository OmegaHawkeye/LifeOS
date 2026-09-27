import { fireEvent, render, screen } from "@testing-library/react-native";
import { Switch } from "@lifeos/ui/switch";

describe("shared native Switch", () => {
  it("exposes its checked state and announces changes accessibly", async () => {
    const onCheckedChange = jest.fn();
    await render(
      <Switch
        accessibilityLabel="Allow passkey sign-in"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    const control = screen.getByRole("switch", {
      name: "Allow passkey sign-in",
    });
    expect(control.props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    });
    fireEvent.press(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not activate when disabled and uses the checked CVA state", async () => {
    const onCheckedChange = jest.fn();
    await render(
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
    expect(control.props.className).toContain("bg-lifeos-accent");
    expect(control.props.className).toContain("h-5");
    fireEvent.press(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
