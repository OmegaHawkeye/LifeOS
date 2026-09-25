import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
      <View style={styles.centered}>
        <Text style={styles.body}>Loading Apple Health settings…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
      <Text style={styles.eyebrow}>PRIVATE, ON YOUR DEVICE</Text>
      <Text style={styles.title}>Apple Health</Text>
      <Text style={styles.body}>
        Choose the categories LifeOS may read. Selected records sync directly
        from this device to your LifeOS server; LifeOS has no cloud relay.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Read-only categories</Text>
        {healthMetrics.map((metric) => {
          const checked = selectedMetrics.includes(metric);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: isWorking }}
              key={metric}
              onPress={() => toggleMetric(metric)}
              style={styles.metric}
            >
              <View
                style={[styles.checkbox, checked && styles.checkboxChecked]}
              >
                {checked ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.metricLabel}>{metricLabels[metric]}</Text>
            </Pressable>
          );
        })}
        <Text style={styles.note}>
          Permissions are requested only when you connect or sync your selected
          categories. LifeOS never writes to Apple Health.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sync status</Text>
        <Text style={styles.status}>
          {state.lastSyncAt
            ? `Last sync: ${new Date(state.lastSyncAt).toLocaleString()}`
            : isConnected
              ? "Connected · no successful sync yet"
              : "Not connected"}
        </Text>
        {state.lastStatus === "failure" ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {state.lastError ?? "The last sync failed."}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isWorking || selectedMetrics.length === 0}
          onPress={() => void syncSelectedData()}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isWorking) && styles.buttonPressed,
            selectedMetrics.length === 0 && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isWorking
              ? "Syncing…"
              : isConnected
                ? "Sync selected data"
                : "Connect and sync selected data"}
          </Text>
        </Pressable>
        {isConnected ? (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={isWorking}
              onPress={() => void (state.paused ? resumeSync() : pauseSync())}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {state.paused ? "Resume syncing" : "Pause syncing"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isWorking}
              onPress={confirmDisconnect}
              style={styles.destructiveButton}
            >
              <Text style={styles.destructiveButtonText}>
                Disconnect and delete imported records
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <Text style={styles.note}>
        Apple does not tell apps whether read access was denied. If no records
        appear, review LifeOS access in the Health app. You can revoke access
        there at any time.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  content: { gap: 16, padding: 24, paddingBottom: 48 },
  eyebrow: {
    color: "#25815b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: { color: "#17251e", fontSize: 30, fontWeight: "800" },
  body: { color: "#65716a", fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e9e4",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionTitle: { color: "#17251e", fontSize: 17, fontWeight: "700" },
  metric: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 40,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#aebbb2",
    borderRadius: 7,
    borderWidth: 1,
    height: 23,
    justifyContent: "center",
    width: 23,
  },
  checkboxChecked: { backgroundColor: "#42c68d", borderColor: "#42c68d" },
  checkmark: { color: "#102c20", fontSize: 16, fontWeight: "800" },
  metricLabel: { color: "#25332b", fontSize: 15, fontWeight: "600" },
  note: { color: "#65716a", fontSize: 13, lineHeight: 19 },
  status: { color: "#3d4b43", fontSize: 14, lineHeight: 20 },
  error: { color: "#a33131", fontSize: 14, lineHeight: 20 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#42c68d",
    borderRadius: 13,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: "#102c20", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#ccd8cf",
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: "#304238", fontSize: 14, fontWeight: "700" },
  destructiveButton: { alignItems: "center", padding: 10 },
  destructiveButtonText: { color: "#a33131", fontSize: 13, fontWeight: "700" },
});
