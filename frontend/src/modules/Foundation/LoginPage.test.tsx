// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const passkeyMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  initializeCsrfProtection: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiFetch: passkeyMocks.apiFetch,
  initializeCsrfProtection: passkeyMocks.initializeCsrfProtection,
}));

vi.mock("@/config/environment", () => ({
  environment: { apiBaseUrl: "" },
}));

vi.mock("./auth-context", () => ({
  useAuth: () => ({
    pendingTwoFactor: null,
    refreshOwner: vi.fn(),
    signIn: vi.fn(),
    verifyTwoFactor: vi.fn(),
  }),
}));

vi.mock("@laravel/passkeys", () => ({
  Passkeys: { configure: vi.fn() },
}));

vi.mock("@laravel/passkeys/react", () => ({
  usePasskeyVerify: () => ({
    isLoading: false,
    isSupported: true,
    error: null,
    verify: passkeyMocks.verify,
  }),
}));

afterEach(() => {
  cleanup();
  passkeyMocks.apiFetch.mockReset();
  passkeyMocks.initializeCsrfProtection.mockReset();
  passkeyMocks.verify.mockReset();
  window.history.replaceState({}, "", "/");
});

describe("mobile passkey sign-in handoff", () => {
  it("prepares once in Strict Mode and verifies only after preparation succeeds", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?mobile_passkey_state=one-time-state",
    );
    passkeyMocks.initializeCsrfProtection.mockResolvedValue(undefined);
    passkeyMocks.apiFetch.mockResolvedValue({ ok: true, status: 200 });
    passkeyMocks.verify.mockResolvedValue(undefined);

    render(
      <StrictMode>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => expect(passkeyMocks.verify).toHaveBeenCalledTimes(1));
    expect(passkeyMocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(passkeyMocks.apiFetch).toHaveBeenCalledWith(
      "/api/v1/mobile/passkeys/prepare",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not start WebAuthn when preparation is rate limited", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?mobile_passkey_state=one-time-state",
    );
    passkeyMocks.initializeCsrfProtection.mockResolvedValue(undefined);
    passkeyMocks.apiFetch.mockResolvedValue({ ok: false, status: 429 });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(document.body).toHaveTextContent(/Too many passkey attempts/i),
    );
    expect(passkeyMocks.verify).not.toHaveBeenCalled();
  });
});
