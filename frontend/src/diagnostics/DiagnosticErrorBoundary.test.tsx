// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalDiagnostics,
  readLocalDiagnostics,
} from "./localDiagnostics";
import { DiagnosticErrorBoundary } from "./DiagnosticErrorBoundary";
import { registerWebDiagnostics } from "./registerWebDiagnostics";
import { environment } from "@/config/environment";

describe("web diagnostics capture", () => {
  beforeEach(() => {
    clearLocalDiagnostics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a recovery screen and records render failures without messages", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function BrokenScreen(): never {
      throw new Error("Private health detail for owner@example.test");
    }

    render(
      <DiagnosticErrorBoundary>
        <BrokenScreen />
      </DiagnosticErrorBoundary>,
    );

    expect(screen.getByText("LifeOS hit a problem")).toBeTruthy();
    expect(JSON.stringify(readLocalDiagnostics())).toContain("unhandled_error");
    expect(JSON.stringify(readLocalDiagnostics())).not.toContain(
      "Private health",
    );
    expect(JSON.stringify(readLocalDiagnostics())).not.toContain(
      "owner@example.test",
    );
  });

  it("captures first-party API failures and browser errors locally", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "private response details" }), {
        status: 500,
        headers: { "X-Correlation-ID": "corr-browser-456" },
      }),
    );
    vi.spyOn(window, "fetch").mockImplementation(fetcher);
    registerWebDiagnostics();
    await window.fetch(
      new URL(
        "/api/v1/users/alice@example.test?access_token=private-token",
        environment.apiBaseUrl || window.location.origin,
      ),
    );
    window.dispatchEvent(
      new ErrorEvent("error", {
        error: new TypeError("private token details"),
      }),
    );

    const report = JSON.stringify(readLocalDiagnostics());

    expect(report).toContain("corr-browser-456");
    expect(report).toContain("/api/v1/users/:id");
    expect(report).not.toContain("alice@example.test");
    expect(report).not.toContain("private-token");
    expect(report).not.toContain("private response details");
    expect(report).toContain("unhandled_error");
    expect(report).not.toContain("private token details");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
