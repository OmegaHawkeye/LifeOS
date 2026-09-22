import { requireNativeModule } from "expo";
import type {
  NativeHealthKitChanges,
  NativeHealthKitMetric,
} from "./LifeOSHealthKit.types";

type LifeOSHealthKitModule = {
  isAvailable(): Promise<boolean>;
  requestReadAuthorization(metrics: NativeHealthKitMetric[]): Promise<boolean>;
  getChanges(
    metric: NativeHealthKitMetric,
    anchor: string | null,
    limit: number,
  ): Promise<NativeHealthKitChanges>;
};

function nativeModule(): LifeOSHealthKitModule {
  return requireNativeModule<LifeOSHealthKitModule>("LifeOSHealthKit");
}

export const LifeOSHealthKit = {
  isAvailable: () => nativeModule().isAvailable(),
  requestReadAuthorization: (metrics: NativeHealthKitMetric[]) =>
    nativeModule().requestReadAuthorization(metrics),
  getChanges: (
    metric: NativeHealthKitMetric,
    anchor: string | null,
    limit: number,
  ): Promise<NativeHealthKitChanges> =>
    nativeModule().getChanges(metric, anchor, limit),
};
