// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./auth-context";
import type { AuthContextValue } from "./auth-context";

vi.mock("./auth", () => ({
  completeTwoFactorChallenge: vi.fn(),
  confirmTwoFactorSetup: vi.fn(),
  createInitialOwner: vi.fn(),
  getCurrentOwner: vi.fn(() => Promise.resolve(null)),
  isInitialOwnerSetupRequired: vi.fn(() => Promise.resolve(false)),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./settings", () => ({
  getOwnerSettings: vi.fn(() => Promise.resolve({ theme: "system" })),
}));

// A controllable prefers-color-scheme media query.
let systemDark = false;
const listeners = new Set<() => void>();
function setSystemDark(dark: boolean) {
  systemDark = dark;
  listeners.forEach((listener) => listener());
}

beforeEach(() => {
  systemDark = false;
  listeners.clear();
  window.matchMedia = vi.fn(() => ({
    get matches() {
      return systemDark;
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  const root = document.documentElement;
  root.className = "";
  delete root.dataset.theme;
  root.style.colorScheme = "";
});

function renderProvider() {
  let auth!: AuthContextValue;
  function Capture() {
    auth = useAuth();
    return null;
  }
  render(
    <AuthProvider>
      <Capture />
    </AuthProvider>,
  );
  return () => auth;
}

describe("AuthProvider theme override", () => {
  it("keeps forced light mode light when the system turns dark", () => {
    const auth = renderProvider();
    act(() => setSystemDark(true));
    expect(document.documentElement).toHaveProperty("className", "dark");

    act(() => auth().setThemeOverride("light"));
    act(() => setSystemDark(true));

    const root = document.documentElement;
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });

  it("sets the wall theme and restores the owner's current theme on exit", () => {
    const auth = renderProvider();

    act(() => auth().setThemeOverride("wall"));
    const root = document.documentElement;
    expect(root.dataset.theme).toBe("wall");
    expect(root.style.colorScheme).toBe("dark");

    // The system changes appearance while the wall is open.
    act(() => setSystemDark(true));
    act(() => auth().setThemeOverride(null));

    expect(root.dataset.theme).toBeUndefined();
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.colorScheme).toBe("dark");
  });
});
