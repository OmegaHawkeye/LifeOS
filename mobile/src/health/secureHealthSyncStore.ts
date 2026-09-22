import * as SecureStore from "expo-secure-store";
import type {
  HealthMetric,
  HealthSyncState,
  HealthSyncStateStore,
} from "./healthTypes";

const deviceKeyName = "lifeos.health.device-key";
const ownerStateKey = (ownerId: number) => `lifeos.health.sync.${ownerId}`;
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const emptyState = (deviceKey: string): HealthSyncState => ({
  deviceKey,
  sourceId: null,
  selectedMetrics: [],
  paused: false,
  anchors: {},
  lastSyncAt: null,
  lastStatus: null,
  lastError: null,
});

export class SecureHealthSyncStore implements HealthSyncStateStore {
  async getDeviceKey(): Promise<string> {
    const saved = await SecureStore.getItemAsync(deviceKeyName, secureOptions);

    if (saved !== null) {
      return saved;
    }

    const created = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    await SecureStore.setItemAsync(deviceKeyName, created, secureOptions);
    return created;
  }

  async get(ownerId: number): Promise<HealthSyncState> {
    const deviceKey = await this.getDeviceKey();
    const serialized = await SecureStore.getItemAsync(
      ownerStateKey(ownerId),
      secureOptions,
    );

    if (serialized === null) {
      return emptyState(deviceKey);
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      if (!this.isState(parsed)) {
        return emptyState(deviceKey);
      }

      return { ...emptyState(deviceKey), ...parsed, deviceKey };
    } catch {
      return emptyState(deviceKey);
    }
  }

  async set(ownerId: number, state: HealthSyncState): Promise<void> {
    await SecureStore.setItemAsync(
      ownerStateKey(ownerId),
      JSON.stringify(state),
      secureOptions,
    );
  }

  async clear(ownerId: number): Promise<void> {
    await SecureStore.deleteItemAsync(ownerStateKey(ownerId), secureOptions);
  }

  private isState(value: unknown): value is HealthSyncState {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const state = value as Partial<HealthSyncState>;
    return (
      typeof state.deviceKey === "string" &&
      (typeof state.sourceId === "number" || state.sourceId === null) &&
      Array.isArray(state.selectedMetrics) &&
      state.selectedMetrics.every((metric) =>
        ["steps", "sleep", "workouts", "weight"].includes(
          metric as HealthMetric,
        ),
      ) &&
      typeof state.paused === "boolean" &&
      typeof state.anchors === "object" &&
      state.anchors !== null
    );
  }
}
