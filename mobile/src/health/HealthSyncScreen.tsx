import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Button } from "@lifeos/ui/button";
import { AppIcon } from "@lifeos/ui/icons";
import { tokenColor } from "@lifeos/ui/tokens";
import { mobileAuthService } from "../auth/mobileAuth";
import { useMobileAuth } from "../auth/authContext";
import { MobileApiError } from "../auth/mobileAuthService";
import { HealthSyncService } from "./healthSyncService";
import { healthKitReader } from "./healthKitReader";
import { SecureHealthSyncStore } from "./secureHealthSyncStore";
import {
  healthMetrics,
  type HealthMetric,
  type HealthSyncState,
} from "./healthTypes";

const healthSyncService = new HealthSyncService({
  api: mobileAuthService,
  healthKit: healthKitReader,
  stateStore: new SecureHealthSyncStore(),
});

const metricLabels: Record<HealthMetric, string> = {
  steps: "Steps",
  sleep: "Sleep",
  workouts: "Workouts",
  weight: "Body mass",
};

export function HealthSyncScreen({
  ownerId,
  service = healthSyncService,
}: {
  ownerId: number;
  service?: HealthSyncService;
}) {
  const { signOut } = useMobileAuth();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const [state, setState] = useState<HealthSyncState | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    service
      .getState(ownerId)
      .then((savedState) => {
        if (current) {
          setState(savedState);
        }
      })
      .catch(() => {
        if (current) {
          setError("Health sync settings could not be loaded.");
        }
      });

    return () => {
      current = false;
    };
  }, [ownerId, service]);

  const selectedMetrics = state?.selectedMetrics ?? [];
  const isConnected = state?.sourceId !== null && state?.sourceId !== undefined;

  function toggleMetric(metric: HealthMetric) {
    if (state === null) {
      return;
    }

    const selectedMetrics = state.selectedMetrics.includes(metric)
      ? state.selectedMetrics.filter((selected) => selected !== metric)
      : [...state.selectedMetrics, metric];
    setState({ ...state, selectedMetrics });
  }

  async function syncSelectedData() {
    if (state === null || selectedMetrics.length === 0) {
      return;
    }

    setIsWorking(true);
    setError(null);
    try {
      setState(await service.connectAndSync(ownerId, selectedMetrics));
    } catch (syncError) {
      if (syncError instanceof MobileApiError && syncError.status === 401) {
        await signOut();
        return;
      }

      const currentState = await service.getState(ownerId).catch(() => state);
      setState(currentState);
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Apple Health could not be synchronized.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function pauseSync() {
    setIsWorking(true);
    setError(null);
    try {
      setState(await service.pause(ownerId));
    } catch {
      setError("Health sync could not be paused.");
    } finally {
      setIsWorking(false);
    }
  }

  async function resumeSync() {
    setIsWorking(true);
    setError(null);
    try {
      setState(await service.resume(ownerId));
    } catch {
      setError("Health sync could not be resumed.");
    } finally {
      setIsWorking(false);
    }
  }

  function confirmDisconnect() {
    Alert.alert(
      "Disconnect Apple Health?",
      "LifeOS will stop syncing and permanently delete the Apple Health records imported from this device. Manual records remain untouched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect and delete",
          style: "destructive",
          onPress: () => void disconnect(),
        },
      ],
    );
  }

  async function disconnect() {
    setIsWorking(true);
    setError(null);
    try {
      setState(await service.disconnect(ownerId));
    } catch (disconnectError) {
      if (
        disconnectError instanceof MobileApiError &&
        disconnectError.status === 401
      ) {
        await signOut();
        return;
      }

      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Apple Health could not be disconnected.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  if (state === null) {
    return (
      <View className="flex-1 justify-center p-6">
        <Text className="text-body text-ink-muted">
          Loading Apple Health settings…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-content gap-4 px-4 pb-10 pt-6 tablet:px-6 tablet:pt-8 desktop:px-8"
    >
      <Text className="text-overline uppercase text-ink-muted">
        Private, on your device
      </Text>
      <Text
        accessibilityRole="header"
        className="text-display-m text-ink tablet:text-display-l"
      >
        Apple Health
      </Text>
      <Text className="text-body text-ink-muted">
        Choose the categories LifeOS may read. Selected records sync directly
        from this device to your LifeOS server; LifeOS has no cloud relay.
      </Text>

      <View className="gap-3 rounded-md border border-line bg-surface p-4 tablet:p-5">
        <Text className="text-title-m text-ink">Read-only categories</Text>
        {healthMetrics.map((metric) => {
          const checked = selectedMetrics.includes(metric);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: isWorking }}
              className="min-h-target-min flex-row items-center gap-3"
              key={metric}
              onPress={() => toggleMetric(metric)}
            >
              <View
                className={`size-6 items-center justify-center rounded-xs border ${checked ? "border-primary bg-primary" : "border-line-strong bg-surface"}`}
              >
                {checked ? (
                  <AppIcon
                    color={tokenColor("on-primary", scheme)}
                    name="check"
                    size={16}
                  />
                ) : null}
              </View>
              <Text className="text-body text-ink">{metricLabels[metric]}</Text>
            </Pressable>
          );
        })}
        <Text className="text-caption text-ink-muted">
          Permissions are requested only when you connect or sync your selected
          categories. LifeOS never writes to Apple Health.
        </Text>
      </View>

      <View className="gap-3 rounded-md border border-line bg-surface p-4 tablet:p-5">
        <Text className="text-title-m text-ink">Sync status</Text>
        <Text className="text-body-s text-ink">
          {state.lastSyncAt
            ? `Last sync: ${new Date(state.lastSyncAt).toLocaleString()}`
            : isConnected
              ? "Connected · no successful sync yet"
              : "Not connected"}
        </Text>
        {state.lastStatus === "failure" ? (
          <Text accessibilityRole="alert" className="text-body-s text-danger">
            {state.lastError ?? "The last sync failed."}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-body-s text-danger">
            {error}
          </Text>
        ) : null}
        <Button
          disabled={selectedMetrics.length === 0}
          loading={isWorking}
          onPress={() => void syncSelectedData()}
        >
          {isWorking
            ? "Syncing…"
            : isConnected
              ? "Sync selected data"
              : "Connect and sync selected data"}
        </Button>
        {isConnected ? (
          <>
            <Button
              disabled={isWorking}
              onPress={() => void (state.paused ? resumeSync() : pauseSync())}
              variant="secondary"
            >
              {state.paused ? "Resume syncing" : "Pause syncing"}
            </Button>
            <Pressable
              accessibilityRole="button"
              className="min-h-target-min items-center justify-center rounded-sm active:bg-danger-soft"
              disabled={isWorking}
              onPress={confirmDisconnect}
            >
              <Text className="text-label text-danger">
                Disconnect and delete imported records
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <Text className="text-caption text-ink-muted">
        Apple does not tell apps whether read access was denied. If no records
        appear, review LifeOS access in the Health app. You can revoke access
        there at any time.
      </Text>
    </ScrollView>
  );
}
