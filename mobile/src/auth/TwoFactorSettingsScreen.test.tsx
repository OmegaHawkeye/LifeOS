import { fireEvent, render, screen } from "@testing-library/react-native";
import { TwoFactorSettingsScreen } from "./TwoFactorSettingsScreen";
import type { MobileTwoFactorService } from "./mobileTwoFactorService";

describe("TwoFactorSettingsScreen", () => {
  test("requires password, confirms the setup code, then hides the secret", async () => {
    let enabled = false;
    const service: Pick<
      MobileTwoFactorService,
      "getStatus" | "beginSetup" | "confirm" | "disable"
    > = {
      getStatus: jest.fn(async () => enabled),
      beginSetup: jest.fn().mockResolvedValue("PRIVATESETUPSECRET"),
      confirm: jest.fn(async () => {
        enabled = true;
      }),
      disable: jest.fn(),
    };
    await render(<TwoFactorSettingsScreen service={service} />);

    await fireEvent.changeText(
      await screen.findByLabelText("Current password"),
      "current password",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Set up authenticator" }),
    );
    expect(service.beginSetup).toHaveBeenCalledWith("current password");
    expect(await screen.findByText("PRIVATESETUPSECRET")).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText("Authenticator code"),
      "123456",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Confirm authenticator" }),
    );
    expect(service.confirm).toHaveBeenCalledWith("123456");
    expect(
      await screen.findByText("Two-factor authentication is on"),
    ).toBeTruthy();
    expect(screen.queryByText("PRIVATESETUPSECRET")).toBeNull();
  });

  test("requires both password and code to disable authentication", async () => {
    const service: Pick<
      MobileTwoFactorService,
      "getStatus" | "beginSetup" | "confirm" | "disable"
    > = {
      getStatus: jest.fn().mockResolvedValue(true),
      beginSetup: jest.fn(),
      confirm: jest.fn(),
      disable: jest.fn().mockResolvedValue(undefined),
    };
    await render(<TwoFactorSettingsScreen service={service} />);

    await screen.findByText("Two-factor authentication is on");
    await fireEvent.changeText(
      screen.getByLabelText("Current password"),
      "current password",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Authenticator code"),
      "123456",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Disable two-factor authentication" }),
    );

    expect(service.disable).toHaveBeenCalledWith("current password", "123456");
    expect(
      await screen.findByText("Two-factor authentication is off"),
    ).toBeTruthy();
  });
});
