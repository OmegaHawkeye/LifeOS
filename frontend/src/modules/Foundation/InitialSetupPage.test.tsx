// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { InitialSetupPage } from "./InitialSetupPage";

const setupMocks = vi.hoisted(() => ({
  createInitialOwner: vi.fn(),
}));

vi.mock("./auth-context", () => ({
  useAuth: () => ({ createInitialOwner: setupMocks.createInitialOwner }),
}));

afterEach(() => {
  cleanup();
  setupMocks.createInitialOwner.mockReset();
});

function renderSetupPage() {
  return render(
    <MemoryRouter initialEntries={["/setup"]}>
      <Routes>
        <Route path="/setup" element={<InitialSetupPage />} />
        <Route path="/login" element={<p>Set up your authenticator</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("InitialSetupPage", () => {
  it("keeps creation disabled until valid account details are entered", async () => {
    const user = userEvent.setup();
    renderSetupPage();

    const submit = screen.getByRole("button", { name: "Create owner account" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "Julian");
    await user.type(screen.getByLabelText("Email"), "owner@example.test");
    await user.type(
      screen.getByLabelText("Password"),
      "a considerably safer password",
    );
    await user.type(
      screen.getByLabelText("Confirm password"),
      "a considerably safer password",
    );

    expect(submit).toBeEnabled();
  });

  it("creates the first owner and continues to the mandatory authenticator step", async () => {
    const user = userEvent.setup();
    setupMocks.createInitialOwner.mockResolvedValue(undefined);
    renderSetupPage();

    await user.type(screen.getByLabelText("Name"), "Julian");
    await user.type(screen.getByLabelText("Email"), "OWNER@example.test");
    await user.type(
      screen.getByLabelText("Password"),
      "a considerably safer password",
    );
    await user.type(
      screen.getByLabelText("Confirm password"),
      "a considerably safer password",
    );
    await user.click(
      screen.getByRole("button", { name: "Create owner account" }),
    );

    expect(setupMocks.createInitialOwner).toHaveBeenCalledWith(
      "Julian",
      "OWNER@example.test",
      "a considerably safer password",
    );
    expect(
      await screen.findByText("Set up your authenticator"),
    ).toBeInTheDocument();
  });

  it("shows a clear error when the account cannot be created", async () => {
    const user = userEvent.setup();
    setupMocks.createInitialOwner.mockRejectedValue(
      new Error("An owner account already exists. Please sign in instead."),
    );
    renderSetupPage();

    await user.type(screen.getByLabelText("Name"), "Julian");
    await user.type(screen.getByLabelText("Email"), "owner@example.test");
    await user.type(
      screen.getByLabelText("Password"),
      "a considerably safer password",
    );
    await user.type(
      screen.getByLabelText("Confirm password"),
      "a considerably safer password",
    );
    await user.click(
      screen.getByRole("button", { name: "Create owner account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An owner account already exists. Please sign in instead.",
    );
  });
});
