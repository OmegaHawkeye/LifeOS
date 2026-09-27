import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "@lifeos/ui/button";

describe("shared native Button", () => {
  it("exposes disabled state and blocks presses", async () => {
    const onPress = jest.fn();
    await render(
      <Button disabled onPress={onPress} variant="primary">
        Save changes
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBeDisabled();
    expect(button.props.className).toContain("disabled:bg-stone-300");
    expect(button.props.className).toContain("bg-stone-300");
    expect(button.props.className).not.toMatch(
      /(?:^|\s)bg-lifeos-accent(?:\s|$)/,
    );
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("announces busy state and uses a progress indicator", async () => {
    await render(
      <Button loading variant="secondary">
        Saving
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState.busy).toBe(true);
  });
});
