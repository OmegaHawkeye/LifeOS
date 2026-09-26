// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  captureUnhandledError,
  clearLocalDiagnostics,
} from "./localDiagnostics";
import { DiagnosticReportPanel } from "./DiagnosticReportPanel";

describe("DiagnosticReportPanel", () => {
  beforeEach(() => {
    clearLocalDiagnostics();
  });

  it("shows a local error report and lets the owner clear it", () => {
    captureUnhandledError(new Error("private health detail"));

    render(<DiagnosticReportPanel />);

    expect(screen.getByText("Local diagnostics")).toBeTruthy();
    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.queryByText("private health detail")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear local diagnostics" }),
    );

    expect(
      screen.getByText("No recent diagnostics recorded on this device."),
    ).toBeTruthy();
  });
});
