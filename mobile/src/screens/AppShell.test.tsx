import { fireEvent, render, screen } from "@testing-library/react-native";
import type { MobileAuthService } from "../auth/mobileAuthService";
import { MobileAuthProvider } from "../auth/authContext";
import { MobileApiError } from "../auth/mobileAuthService";
import { LifeOSApp } from "../../App";

const owner = { id: 7, name: "Julian", email: "julian@example.test" };

function authService(
  overrides: Partial<MobileAuthService> = {},
): MobileAuthService {
  return {
    restoreSession: jest.fn().mockResolvedValue(null),
    signIn: jest.fn().mockResolvedValue({
      status: "challenge_required",
      challengeToken: "pending-login",
      expiresAt: "2026-09-22T08:00:00Z",
    }),
    verifySecondFactor: jest.fn().mockResolvedValue(owner),
    cancelChallenge: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    request: jest.fn(async (path: string) => {
      if (path.startsWith("/finance/overview")) {
        return { data: { month: "2026-09", totals: [] } };
      }
      if (path === "/security/two-factor") {
        return { data: { enabled: false } };
      }
      if (path === "/finance/accounts") {
        return { data: [] };
      }
      if (path === "/finance/categories") {
        return { data: [] };
      }
      if (path.startsWith("/finance/transactions")) {
        return { data: [] };
      }
      if (path === "/fitness/dashboard") {
        return {
          data: {
            active_goals: [],
            measurement_trends: [],
            weekly_workouts: { planned: 0, completed: 0, streak_days: 0 },
            personal_records: [],
            next_workout: null,
          },
        };
      }
      if (path === "/fitness/body-metrics?days=90") {
        return { data: [] };
      }
      if (path === "/fitness/workout-sessions") {
        return { data: [] };
      }
      if (path.startsWith("/nutrition/dashboard")) {
        return {
          data: { today: { planned_meal_count: 0, eaten_meal_count: 0 } },
        };
      }
      if (path === "/routines") {
        return { data: { routines: [] } };
      }
      return {
        data: {
          currency: "EUR",
          mask_sensitive_data_by_default: true,
          timezone: "Europe/Vienna",
        },
      };
    }),
    ...overrides,
  } as unknown as MobileAuthService;
}

describe("LifeOS native shell", () => {
  test("checks the password before showing MFA, navigates, and signs out", async () => {
    const service = authService();
    await render(
      <MobileAuthProvider service={service}>
        <LifeOSApp />
      </MobileAuthProvider>,
    );

    await fireEvent.changeText(
      await screen.findByLabelText("LifeOS email"),
      owner.email,
    );
    await fireEvent.changeText(
      screen.getByLabelText("LifeOS password"),
      "private password",
    );

    expect(screen.queryByLabelText("Authenticator code")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(service.signIn).toHaveBeenCalledTimes(1);
    expect(service.signIn).toHaveBeenCalledWith(
      owner.email,
      "private password",
      "LifeOS iOS device",
    );
    const authenticatorCode =
      await screen.findByLabelText("Authenticator code");
    expect(authenticatorCode.props.textContentType).toBe("oneTimeCode");
    expect(authenticatorCode.props.autoComplete).toBeUndefined();
    expect(screen.queryByLabelText("LifeOS password")).toBeNull();

    await fireEvent.changeText(
      screen.getByLabelText("Authenticator code"),
      "123456",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Verify code" }));

    expect(service.verifySecondFactor).toHaveBeenCalledTimes(1);
    expect(service.verifySecondFactor).toHaveBeenCalledWith(
      "pending-login",
      "123456",
    );
    expect(await screen.findByText("Your day, in context")).toBeTruthy();
    expect(
      screen.getByTestId("today-dashboard-scroll").props.className,
    ).toContain("flex-1");
    for (const icon of [
      "today",
      "finance",
      "fitness",
      "nutrition",
      "health",
      "settings",
    ]) {
      expect(
        screen.getAllByTestId(`navigation-${icon}`).length,
      ).toBeGreaterThan(0);
    }

    await fireEvent.press(
      screen.getByRole("button", { name: "Navigate to Finance" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Navigate to Finance",
        selected: true,
      }),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Navigate to Fitness" }),
    );
    expect(await screen.findByText("Record a body metric")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Navigate to Health" }),
    );
    expect(await screen.findByText("Read-only categories")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(service.signOut).toHaveBeenCalledTimes(1);
  });

  test("restores an existing owner session without showing the login screen", async () => {
    const service = authService({
      restoreSession: jest.fn().mockResolvedValue(owner),
    });
    await render(
      <MobileAuthProvider service={service}>
        <LifeOSApp />
      </MobileAuthProvider>,
    );

    expect(await screen.findByText("Your day, in context")).toBeTruthy();
    expect(screen.queryByLabelText("LifeOS email")).toBeNull();
  });

  test("returns to sign-in when a dashboard request detects an expired session", async () => {
    const service = authService({
      restoreSession: jest.fn().mockResolvedValue(owner),
      request: jest
        .fn()
        .mockRejectedValue(
          new MobileApiError("Your session has expired.", 401),
        ),
    });
    await render(
      <MobileAuthProvider service={service}>
        <LifeOSApp />
      </MobileAuthProvider>,
    );

    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(screen.queryByText("Your day, in context")).toBeNull();
  });

  test("keeps the authenticator step open when its code is rejected", async () => {
    const service = authService({
      verifySecondFactor: jest
        .fn()
        .mockRejectedValue(
          new Error("The authenticator code is incorrect or expired."),
        ),
    });
    await render(
      <MobileAuthProvider service={service}>
        <LifeOSApp />
      </MobileAuthProvider>,
    );

    await fireEvent.changeText(
      await screen.findByLabelText("LifeOS email"),
      owner.email,
    );
    await fireEvent.changeText(
      screen.getByLabelText("LifeOS password"),
      "private password",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await screen.findByLabelText("Authenticator code");
    await fireEvent.changeText(
      screen.getByLabelText("Authenticator code"),
      "123456",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Verify code" }));

    expect((await screen.findByRole("alert")).props.children).toBe(
      "The authenticator code is incorrect or expired.",
    );
    expect(screen.getByLabelText("Authenticator code")).toBeTruthy();
    expect(screen.queryByText("Your day, in context")).toBeNull();
  });

  test("completes first-time authenticator enrollment before entering the app", async () => {
    const service = authService({
      signIn: jest.fn().mockResolvedValue({
        status: "setup_required",
        challengeToken: "pending-setup",
        expiresAt: "2026-09-22T08:00:00Z",
        secret: "PRIVATESETUPSECRET",
      }),
    });
    await render(
      <MobileAuthProvider service={service}>
        <LifeOSApp />
      </MobileAuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText("LifeOS email"),
      owner.email,
    );
    await fireEvent.changeText(
      screen.getByLabelText("LifeOS password"),
      "password",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("PRIVATESETUPSECRET")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Confirm authenticator" }),
    ).toBeTruthy();
    expect(screen.queryByText("Your day, in context")).toBeNull();

    await fireEvent.changeText(
      screen.getByLabelText("Authenticator code"),
      "123456",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Confirm authenticator" }),
    );
    expect(service.verifySecondFactor).toHaveBeenCalledWith(
      "pending-setup",
      "123456",
    );
    expect(await screen.findByText("Your day, in context")).toBeTruthy();
  });

  test("cancels first-time enrollment before hiding its setup key", async () => {
    const service = authService({
      signIn: jest.fn().mockResolvedValue({
        status: "setup_required",
        challengeToken: "pending-setup",
        expiresAt: "2026-09-22T08:00:00Z",
        secret: "PRIVATESETUPSECRET",
      }),
    });
    await render(
      <MobileAuthProvider service={service}>
        <LifeOSApp />
      </MobileAuthProvider>,
    );
    await fireEvent.changeText(
      await screen.findByLabelText("LifeOS email"),
      owner.email,
    );
    await fireEvent.changeText(
      screen.getByLabelText("LifeOS password"),
      "password",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("PRIVATESETUPSECRET")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Use a different account" }),
    );

    expect(service.cancelChallenge).toHaveBeenCalledWith("pending-setup");
    expect(await screen.findByLabelText("LifeOS email")).toBeTruthy();
    expect(screen.queryByText("PRIVATESETUPSECRET")).toBeNull();
  });
});
