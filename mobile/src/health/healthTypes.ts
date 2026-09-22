export const healthMetrics = ["steps", "sleep", "workouts", "weight"] as const;

export type HealthMetric = (typeof healthMetrics)[number];

export type HealthKitSample = {
  id: string;
  value: number;
  unit: string;
  recordedAt: string;
  endedAt: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type HealthKitChanges = {
  added: HealthKitSample[];
  deletedIds: string[];
  anchor: string;
};

export type HealthKitReader = {
  isAvailable(): Promise<boolean>;
  requestReadAuthorization(metrics: HealthMetric[]): Promise<void>;
  getChanges(
    metric: HealthMetric,
    anchor: string | null,
  ): Promise<HealthKitChanges>;
};

export type HealthSyncState = {
  deviceKey: string;
  sourceId: number | null;
  selectedMetrics: HealthMetric[];
  paused: boolean;
  anchors: Partial<Record<HealthMetric, string>>;
  lastSyncAt: string | null;
  lastStatus: "success" | "failure" | null;
  lastError: string | null;
};

export interface HealthSyncStateStore {
  getDeviceKey(): Promise<string>;
  get(ownerId: number): Promise<HealthSyncState>;
  set(ownerId: number, state: HealthSyncState): Promise<void>;
  clear(ownerId: number): Promise<void>;
}
