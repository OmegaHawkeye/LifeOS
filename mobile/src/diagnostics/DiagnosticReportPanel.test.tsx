const mockStorage = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "when-unlocked",
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(mockStorage.get(key) ?? null),
  ),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
}));

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import { captureUnhandledError } from "./localDiagnostics";
import { DiagnosticReportPanel } from "./DiagnosticReportPanel";

describe("DiagnosticReportPanel", () => {
  beforeEach(async () => {
    mockStorage.clear();
    jest.spyOn(Share, "share").mockResolvedValue({
      action: "sharedAction",
    });
  });

  test("shows local diagnostics and requires an explicit export action", async () => {
    captureUnhandledError(new Error("private health details"));

    await render(<DiagnosticReportPanel />);

    expect(await screen.findByText("Local diagnostics")).toBeTruthy();
    expect(await screen.findByText("Error")).toBeTruthy();
    expect(screen.queryByText("private health details")).toBeNull();
    expect(Share.share).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Export diagnostic report" }),
    );

    expect(Share.share).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Share.share).mock.calls[0][0].message).not.toContain(
      "private health details",
    );
  });
});
