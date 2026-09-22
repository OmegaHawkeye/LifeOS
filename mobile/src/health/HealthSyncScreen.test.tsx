import { fireEvent, render, screen } from "@testing-library/react-native";
import { HealthSyncScreen } from "./HealthSyncScreen";
import type { HealthSyncService } from "./healthSyncService";
import type { HealthSyncState } from "./healthTypes";

jest.mock("../auth/authContext", () => ({
  useMobileAuth: () => ({ signOut: jest.fn() }),
}));

const state: HealthSyncState = {
  deviceKey: "test-device",
  sourceId: null,
  selectedMetrics: [],
  paused: false,
  anchors: {},
  lastSyncAt: null,
  lastStatus: null,
  lastError: null,
};

describe("Apple Health sync controls", () => {
  test("only requests the category explicitly selected before connecting", async () => {
    const service = {
      getState: jest.fn().mockResolvedValue(state),
      connectAndSync: jest.fn().mockResolvedValue({
        ...state,
        sourceId: 17,
        selectedMetrics: ["steps"],
        lastStatus: "success",
        lastSyncAt: "2026-09-21T12:00:00.000Z",
      }),
    } as unknown as HealthSyncService;

    await render(<HealthSyncScreen ownerId={8} service={service} />);

    await screen.findByText("Read-only categories");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Steps" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Connect and sync selected data" }),
    );

    expect(service.connectAndSync).toHaveBeenCalledWith(8, ["steps"]);
  });
});
