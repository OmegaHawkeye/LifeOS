export type NativeHealthKitMetric = "steps" | "sleep" | "workouts" | "weight";

export type NativeHealthKitSample = {
  id: string;
  value: number;
  unit: string;
  recordedAt: string;
  endedAt: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type NativeHealthKitChanges = {
  added: NativeHealthKitSample[];
  deletedIds: string[];
  anchor: string;
};
