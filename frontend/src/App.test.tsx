// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  completeTwoFactorChallenge,
  confirmTwoFactorSetup,
  getCurrentOwner,
  signIn,
  signOut,
} from "./modules/Foundation/auth";
import {
  getBackupStatus,
  getOwnerSettings,
  updateOwnerSettings,
} from "./modules/Foundation/settings";

vi.mock("./modules/Foundation/auth", () => ({
  getCurrentOwner: vi.fn(),
  completeTwoFactorChallenge: vi.fn(),
  confirmTwoFactorSetup: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./modules/Foundation/settings", () => ({
  getBackupStatus: vi.fn(),
  getOwnerSettings: vi.fn(),
  updateOwnerSettings: vi.fn(),
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();

  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      GET: vi.fn().mockResolvedValue({
        data: undefined,
        response: new Response(null, { status: 500 }),
      }),
    },
    apiFetch: vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        headers: { "Content-Type": "application/json" },
      }),
    ),
    initializeCsrfProtection: vi.fn().mockResolvedValue(undefined),
  };
});

const owner = { id: 1, name: "Julian", email: "owner@example.test" };
const settings = {
  timezone: "Europe/Vienna",
  currency: "EUR",
  measurement_system: "metric" as const,
  theme: "system" as const,
  mask_sensitive_data_by_default: true,
  notifications_enabled: false,
  passkeys_enabled: true,
  passkey_origin: "http://localhost:8000",
  passkey_origin_is_secure: false,
};

describe("LifeOS authenticated app shell", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    vi.mocked(getCurrentOwner).mockResolvedValue(null);
    vi.mocked(signIn).mockResolvedValue({
      status: "setup_required",
      secret: "TESTBASE32SECRET",
    });
    vi.mocked(confirmTwoFactorSetup).mockResolvedValue(owner);
    vi.mocked(completeTwoFactorChallenge).mockResolvedValue(owner);
    vi.mocked(signOut).mockResolvedValue(undefined);
    vi.mocked(getOwnerSettings).mockResolvedValue(settings);
    vi.mocked(getBackupStatus).mockResolvedValue({
      status: "ok",
      last_attempt_at: "2026-09-21T02:00:00+02:00",
      last_successful_backup_at: "2026-09-21T02:00:00+02:00",
      retention_days: 30,
      scheduled_time: "02:00",
    });
    vi.mocked(updateOwnerSettings).mockImplementation(async (values) => ({
      ...settings,
      ...values,
    }));
  });

  it("sends unauthenticated visitors to sign in before private screens render", async () => {
    window.history.replaceState({}, "", "/finance");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Finance" }),
    ).not.toBeInTheDocument();
  });

  it("lets the owner enter the shell and save persistent settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      await screen.findByLabelText("Email"),
      "owner@example.test",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "a long private password",
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", {
        name: "Set up two-factor authentication",
      }),
    ).toBeVisible();
    expect(screen.getByText("TESTBASE32SECRET")).toBeVisible();
    await user.type(
      screen.getByLabelText("6-digit authenticator code"),
      "123456",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm authenticator" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    for (const label of [
      "Dashboard",
      "Finance",
      "Fitness",
      "Nutrition",
      "Health",
      "Settings",
    ]) {
      expect(
        within(navigation).getByRole("link", { name: label }),
      ).toBeVisible();
    }
    expect(within(navigation).getAllByTestId(/^navigation-icon-/)).toHaveLength(
      6,
    );

    await user.click(
      within(navigation).getByRole("link", { name: "Settings" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeVisible();
    expect(
      await screen.findByText(/Automatic daily backups · 30 days/),
    ).toBeVisible();
    expect(await screen.findByText(/Last successful backup:/)).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Appearance"), "dark");
    await user.click(screen.getByLabelText(/Enable in-app reminders/));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(updateOwnerSettings).toHaveBeenCalledWith({
        ...settings,
        theme: "dark",
        notifications_enabled: true,
      }),
    );
    expect(await screen.findByText("Settings saved.")).toBeVisible();
  });

  it("returns to sign in when any API request reports an expired session", async () => {
    vi.mocked(getCurrentOwner).mockResolvedValue(owner);
    window.history.replaceState({}, "", "/settings");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeVisible();
    window.dispatchEvent(new Event("lifeos:unauthorized"));

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
  });
});
