// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  captureApiFailure,
  captureUnhandledError,
  clearLocalDiagnostics,
  readLocalDiagnostics,
} from "./localDiagnostics";

describe("local diagnostics", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores actionable API failure metadata without request secrets or payloads", () => {
    captureApiFailure(
      new Request(
        "https://lifeos.local/api/v1/users/alice@example.test?access_token=private-token",
        {
          method: "POST",
          body: JSON.stringify({ weight: 72, password: "secret" }),
        },
      ),
      new Response(JSON.stringify({ message: "secret response" }), {
        status: 500,
        headers: { "X-Correlation-ID": "corr-api-123" },
      }),
    );

    const report = readLocalDiagnostics();
    const serializedReport = JSON.stringify(report);

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      kind: "api_failure",
      method: "POST",
      route: "/api/v1/users/:id",
      status: 500,
      correlationId: "corr-api-123",
    });
    expect(serializedReport).not.toContain("alice@example.test");
    expect(serializedReport).not.toContain("private-token");
    expect(serializedReport).not.toContain("weight");
    expect(serializedReport).not.toContain("secret");
  });

  it("records unhandled errors without retaining their message or stack", () => {
    const error = new Error("Health value 72kg for alice@example.test");

    error.stack = "stack with password=secret";
    captureUnhandledError(error);

    const serializedReport = JSON.stringify(readLocalDiagnostics());

    expect(serializedReport).toContain("unhandled_error");
    expect(serializedReport).not.toContain("72kg");
    expect(serializedReport).not.toContain("alice@example.test");
    expect(serializedReport).not.toContain("password");
    expect(serializedReport).not.toContain("secret");
    expect(serializedReport).not.toContain("stack");
  });

  it("clears the locally stored report", () => {
    captureUnhandledError(new TypeError("private details"));

    clearLocalDiagnostics();

    expect(readLocalDiagnostics()).toEqual([]);
  });
});
