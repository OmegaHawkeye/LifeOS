import type { MobileAuthService } from "../auth/mobileAuthService";
import type {
  HealthKitReader,
  HealthMetric,
  HealthSyncState,
  HealthSyncStateStore,
} from "./healthTypes";

type ApiEnvelope<T> = { data: T };
type HealthSource = {
  id: number;
  key: string;
  kind: string;
  revoked_at?: string | null;
};
type HealthSyncRun = { id: number };
type HealthSyncServiceOptions = {
  api: Pick<MobileAuthService, "request">;
  healthKit: HealthKitReader;
  stateStore: HealthSyncStateStore;
  now?: () => Date;
};

const defaultState = (deviceKey: string): HealthSyncState => ({
  deviceKey,
  sourceId: null,
  selectedMetrics: [],
  paused: false,
  anchors: {},
  lastSyncAt: null,
  lastStatus: null,
  lastError: null,
});

const sampleTypes: Record<HealthMetric, string> = {
  steps: "steps",
  sleep: "sleep",
  workouts: "workouts",
  weight: "weight",
};

export class HealthSyncService {
  private readonly api: Pick<MobileAuthService, "request">;
  private readonly healthKit: HealthKitReader;
  private readonly stateStore: HealthSyncStateStore;
  private readonly now: () => Date;

  constructor(options: HealthSyncServiceOptions) {
    this.api = options.api;
    this.healthKit = options.healthKit;
    this.stateStore = options.stateStore;
    this.now = options.now ?? (() => new Date());
  }

  async getState(ownerId: number): Promise<HealthSyncState> {
    const state = await this.stateStore.get(ownerId);
    const deviceKey = state.deviceKey || (await this.stateStore.getDeviceKey());

    return { ...defaultState(deviceKey), ...state, deviceKey };
  }

  async connectAndSync(
    ownerId: number,
    selectedMetrics: HealthMetric[],
  ): Promise<HealthSyncState> {
    const uniqueMetrics = [...new Set(selectedMetrics)];

    if (uniqueMetrics.length === 0) {
      throw new Error("Select at least one health category to sync.");
    }

    let state = await this.getState(ownerId);

    if (state.sourceId !== null && state.paused) {
      throw new Error(
        "Apple Health syncing is paused. Resume it before syncing.",
      );
    }

    state = { ...state, selectedMetrics: uniqueMetrics, paused: false };
    await this.stateStore.set(ownerId, state);

    try {
      if (!(await this.healthKit.isAvailable())) {
        throw new Error("Apple Health is not available on this device.");
      }

      await this.healthKit.requestReadAuthorization(uniqueMetrics);
      state = await this.ensureSource(ownerId, state);
      const run = await this.startRun(state.sourceId!);
      let importedCount = 0;
      let skippedCount = 0;

      try {
        for (const metric of uniqueMetrics) {
          const changes = await this.healthKit.getChanges(
            metric,
            state.anchors[metric] ?? null,
          );

          for (const sample of changes.added) {
            const result = await this.api.request<{
              data: unknown;
              meta?: { idempotent?: boolean };
            }>("/health/samples", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source_id: state.sourceId,
                sync_run_id: run.id,
                external_id: sample.id,
                sample_type: sampleTypes[metric],
                value: sample.value,
                unit: sample.unit,
                recorded_at: sample.recordedAt,
                ended_at: sample.endedAt,
                metadata: {
                  ...sample.metadata,
                  provider: "apple_healthkit",
                },
                is_manual: false,
              }),
            });
            if (result.meta?.idempotent) {
              skippedCount += 1;
            } else {
              importedCount += 1;
            }
          }

          for (const externalId of changes.deletedIds) {
            await this.api.request<unknown>(
              `/health/sources/${state.sourceId}/samples/${encodeURIComponent(externalId)}`,
              { method: "DELETE" },
            );
          }

          state = {
            ...state,
            anchors: { ...state.anchors, [metric]: changes.anchor },
          };
          await this.stateStore.set(ownerId, state);
        }

        await this.finishRun(run.id, {
          status: "success",
          imported_count: importedCount,
          skipped_count: skippedCount,
          failed_count: 0,
        });
        state = {
          ...state,
          lastSyncAt: this.now().toISOString(),
          lastStatus: "success",
          lastError: null,
        };
        await this.stateStore.set(ownerId, state);

        return state;
      } catch (error) {
        await this.finishRun(run.id, {
          status: "failure",
          imported_count: importedCount,
          skipped_count: skippedCount,
          failed_count: 1,
          error_summary: { message: safeErrorMessage(error) },
        });
        throw error;
      }
    } catch (error) {
      state = {
        ...state,
        lastStatus: "failure",
        lastError: safeErrorMessage(error),
      };
      await this.stateStore.set(ownerId, state);
      throw error;
    }
  }

  async pause(ownerId: number): Promise<HealthSyncState> {
    const state = { ...(await this.getState(ownerId)), paused: true };
    await this.stateStore.set(ownerId, state);
    return state;
  }

  async resume(ownerId: number): Promise<HealthSyncState> {
    const state = { ...(await this.getState(ownerId)), paused: false };
    await this.stateStore.set(ownerId, state);
    return state;
  }

  async disconnect(ownerId: number): Promise<HealthSyncState> {
    const state = await this.getState(ownerId);

    if (state.sourceId !== null) {
      await this.api.request<unknown>(`/health/sources/${state.sourceId}`, {
        method: "DELETE",
      });
    }

    const disconnectedState = defaultState(state.deviceKey);
    await this.stateStore.set(ownerId, disconnectedState);
    return disconnectedState;
  }

  private async ensureSource(
    ownerId: number,
    state: HealthSyncState,
  ): Promise<HealthSyncState> {
    if (state.sourceId !== null) {
      return state;
    }

    const key = `healthkit:${state.deviceKey}`;
    const sources =
      await this.api.request<ApiEnvelope<HealthSource[]>>("/health/sources");
    const existingSource = sources.data.find(
      (source) => source.key === key && source.revoked_at == null,
    );
    const source =
      existingSource ??
      (
        await this.api.request<ApiEnvelope<HealthSource>>("/health/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            name: "Apple Health · this device",
            kind: "healthkit",
          }),
        })
      ).data;
    const nextState = { ...state, sourceId: source.id };
    await this.stateStore.set(ownerId, nextState);

    return nextState;
  }

  private async startRun(sourceId: number): Promise<HealthSyncRun> {
    const response = await this.api.request<ApiEnvelope<HealthSyncRun>>(
      "/health/sync-runs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId }),
      },
    );

    return response.data;
  }

  private async finishRun(
    runId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.api.request<ApiEnvelope<unknown>>(`/health/sync-runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Health data could not be synchronized.";
}
