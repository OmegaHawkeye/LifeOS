import { Platform } from "react-native";
import { LifeOSHealthKit } from "../../modules/lifeos-healthkit";
import type { HealthKitReader } from "./healthTypes";

export const healthKitReader: HealthKitReader = {
  async isAvailable(): Promise<boolean> {
    return Platform.OS === "ios" ? LifeOSHealthKit.isAvailable() : false;
  },
  async requestReadAuthorization(metrics) {
    if (Platform.OS !== "ios") {
      throw new Error(
        "Apple Health sync is available on iPhone and iPad only.",
      );
    }

    await LifeOSHealthKit.requestReadAuthorization(metrics);
  },
  async getChanges(metric, anchor) {
    if (Platform.OS !== "ios") {
      throw new Error(
        "Apple Health sync is available on iPhone and iPad only.",
      );
    }

    return LifeOSHealthKit.getChanges(metric, anchor, 5000);
  },
};
