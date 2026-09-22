import type { MobileAuthService } from "../auth/mobileAuthService";
import { HealthSyncService } from "./healthSyncService";
import type {
  HealthKitReader,
  HealthSyncState,
  HealthSyncStateStore,
} from "./healthTypes";

class MemoryHealthSyncStateStore implements HealthSyncStateStore {
  private readonly states = new Map<number, HealthSyncState>();

  async getDeviceKey(): Promise<string> {
    return "device-1";
  }

  async get(ownerId: number): Promise<HealthSyncState> {
    return (
      this.states.get(ownerId) ?? {
        deviceKey: await this.getDeviceKey(),
        sourceId: null,
        selectedMetrics: [],
        paused: false,
        anchors: {},
        lastSyncAt: null,
        lastStatus: null,
        lastError: null,
      }
    );
  }

  async set(ownerId: number, state: HealthSyncState): Promise<void> {
    this.states.set(ownerId, state);
  }

  async clear(ownerId: number): Promise<void> {
    this.states.delete(ownerId);
  }
}

describe("HealthKit sync public flow", () => {
  test("requests and imports only the owner's selected read-only categories", async () => {
    const healthKit: HealthKitReader = {
      isAvailable: jest.fn().mockResolvedValue(true),
      requestReadAuthorization: jest.fn().mockResolvedValue(undefined),
      getChanges: jest.fn().mockResolvedValue({
        added: [
          {
            id: "hk-step-1",
            value: 1200,
            unit: "count",
            recordedAt: "2026-09-21T09:00:00+02:00",
            endedAt: "2026-09-21T10:00:00+02:00",
            metadata: { source_name: "Apple Watch" },
          },
        ],
        deletedIds: [],
        anchor: "encrypted-anchor-1",
      }),
    };
    const request = jest.fn<Promise<unknown>, [string, RequestInit?]>();
    request.mockImplementation(async (path, init) => {
      if (path === "/health/sources" && init?.method === "POST") {
        return {
          data: { id: 11, key: "healthkit:device-1", kind: "healthkit" },
        };
      }
      if (path === "/health/sources") {
        return {
          data: [
            {
              id: 9,
              key: "healthkit:device-1",
              kind: "healthkit",
              revoked_at: "2026-09-20T12:00:00.000Z",
            },
          ],
        };
      }
      if (path === "/health/sync-runs") {
        return { data: { id: 23 } };
      }
      if (path === "/health/samples") {
        return { data: { id: 31 }, meta: { idempotent: false } };
      }
      return { data: {} };
    });
    const stateStore = new MemoryHealthSyncStateStore();
    const service = new HealthSyncService({
      api: { request } as Pick<MobileAuthService, "request">,
      healthKit,
      stateStore,
      now: () => new Date("2026-09-21T12:00:00.000Z"),
    });

    const state = await service.connectAndSync(5, ["steps"]);

    expect(healthKit.requestReadAuthorization).toHaveBeenCalledWith(["steps"]);
    expect(healthKit.getChanges).toHaveBeenCalledTimes(1);
    expect(healthKit.getChanges).toHaveBeenCalledWith("steps", null);
    expect(request).toHaveBeenCalledWith(
      "/health/samples",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          source_id: 11,
          sync_run_id: 23,
          external_id: "hk-step-1",
          sample_type: "steps",
          value: 1200,
          unit: "count",
          recorded_at: "2026-09-21T09:00:00+02:00",
          ended_at: "2026-09-21T10:00:00+02:00",
          metadata: { source_name: "Apple Watch", provider: "apple_healthkit" },
          is_manual: false,
        }),
      }),
    );
    expect(state).toMatchObject({
      sourceId: 11,
      selectedMetrics: ["steps"],
      lastStatus: "success",
      lastSyncAt: "2026-09-21T12:00:00.000Z",
      anchors: { steps: "encrypted-anchor-1" },
    });
  });

  test("uses the saved cursor, treats repeated samples as skipped, and forwards HealthKit deletions", async () => {
    const healthKit: HealthKitReader = {
      isAvailable: jest.fn().mockResolvedValue(true),
      requestReadAuthorization: jest.fn().mockResolvedValue(undefined),
      getChanges: jest.fn().mockResolvedValue({
        added: [
          {
            id: "hk-step-existing",
            value: 1200,
            unit: "count",
            recordedAt: "2026-09-21T09:00:00+02:00",
            endedAt: null,
            metadata: {},
          },
        ],
        deletedIds: ["hk-step-deleted"],
        anchor: "next-anchor",
      }),
    };
    const request = jest.fn<Promise<unknown>, [string, RequestInit?]>();
    request.mockImplementation(async (path, init) => {
      if (path === "/health/sync-runs" && init?.method === "POST") {
        return { data: { id: 44 } };
      }
      if (path === "/health/samples") {
        return { data: {}, meta: { idempotent: true } };
      }
      return { data: {} };
    });
    const stateStore = new MemoryHealthSyncStateStore();
    await stateStore.set(5, {
      deviceKey: "device-1",
      sourceId: 11,
      selectedMetrics: ["steps"],
      paused: false,
      anchors: { steps: "saved-anchor" },
      lastSyncAt: null,
      lastStatus: null,
      lastError: null,
    });
    const service = new HealthSyncService({
      api: { request } as Pick<MobileAuthService, "request">,
      healthKit,
      stateStore,
    });

    await service.connectAndSync(5, ["steps"]);

    expect(healthKit.getChanges).toHaveBeenCalledWith("steps", "saved-anchor");
    expect(request).toHaveBeenCalledWith(
      "/health/sources/11/samples/hk-step-deleted",
      { method: "DELETE" },
    );
    expect(request).toHaveBeenCalledWith(
      "/health/sync-runs/44",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          status: "success",
          imported_count: 0,
          skipped_count: 1,
          failed_count: 0,
        }),
      }),
    );
    expect((await service.getState(5)).anchors.steps).toBe("next-anchor");
  });

  test("does not advance a cursor when authorization is denied", async () => {
    const healthKit: HealthKitReader = {
      isAvailable: jest.fn().mockResolvedValue(true),
      requestReadAuthorization: jest
        .fn()
        .mockRejectedValue(new Error("Apple Health authorization failed.")),
      getChanges: jest.fn(),
    };
    const request = jest.fn<Promise<unknown>, [string, RequestInit?]>();
    const stateStore = new MemoryHealthSyncStateStore();
    await stateStore.set(5, {
      deviceKey: "device-1",
      sourceId: 11,
      selectedMetrics: ["sleep"],
      paused: false,
      anchors: { sleep: "previous-anchor" },
      lastSyncAt: null,
      lastStatus: null,
      lastError: null,
    });
    const service = new HealthSyncService({
      api: { request } as Pick<MobileAuthService, "request">,
      healthKit,
      stateStore,
    });

    await expect(service.connectAndSync(5, ["sleep"])).rejects.toThrow(
      "Apple Health authorization failed.",
    );

    expect(request).not.toHaveBeenCalled();
    expect(await service.getState(5)).toMatchObject({
      selectedMetrics: ["sleep"],
      anchors: { sleep: "previous-anchor" },
      lastStatus: "failure",
      lastError: "Apple Health authorization failed.",
    });
  });

  test("retains the previous cursor if a later HealthKit query fails", async () => {
    const healthKit: HealthKitReader = {
      isAvailable: jest.fn().mockResolvedValue(true),
      requestReadAuthorization: jest.fn().mockResolvedValue(undefined),
      getChanges: jest
        .fn()
        .mockRejectedValue(new Error("HealthKit query failed.")),
    };
    const request = jest.fn<Promise<unknown>, [string, RequestInit?]>();
    request.mockImplementation(async (path, init) => {
      if (path === "/health/sync-runs" && init?.method === "POST") {
        return { data: { id: 45 } };
      }
      return { data: {} };
    });
    const stateStore = new MemoryHealthSyncStateStore();
    await stateStore.set(5, {
      deviceKey: "device-1",
      sourceId: 11,
      selectedMetrics: ["steps"],
      paused: false,
      anchors: { steps: "previous-anchor" },
      lastSyncAt: null,
      lastStatus: null,
      lastError: null,
    });
    const service = new HealthSyncService({
      api: { request } as Pick<MobileAuthService, "request">,
      healthKit,
      stateStore,
    });

    await expect(service.connectAndSync(5, ["steps"])).rejects.toThrow(
      "HealthKit query failed.",
    );

    expect((await service.getState(5)).anchors.steps).toBe("previous-anchor");
    expect((await service.getState(5)).lastStatus).toBe("failure");
    expect(request).toHaveBeenCalledWith(
      "/health/sync-runs/45",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"status":"failure"'),
      }),
    );
  });

  test("pausing blocks later syncs until the owner resumes", async () => {
    const healthKit: HealthKitReader = {
      isAvailable: jest.fn().mockResolvedValue(true),
      requestReadAuthorization: jest.fn().mockResolvedValue(undefined),
      getChanges: jest.fn(),
    };
    const request = jest.fn<Promise<unknown>, [string, RequestInit?]>();
    const stateStore = new MemoryHealthSyncStateStore();
    await stateStore.set(5, {
      deviceKey: "device-1",
      sourceId: 11,
      selectedMetrics: ["steps"],
      paused: false,
      anchors: {},
      lastSyncAt: null,
      lastStatus: null,
      lastError: null,
    });
    const service = new HealthSyncService({
      api: { request } as Pick<MobileAuthService, "request">,
      healthKit,
      stateStore,
    });

    await service.pause(5);
    await expect(service.connectAndSync(5, ["steps"])).rejects.toThrow(
      "Apple Health syncing is paused.",
    );
    expect(request).not.toHaveBeenCalled();
    expect((await service.resume(5)).paused).toBe(false);
  });
});
