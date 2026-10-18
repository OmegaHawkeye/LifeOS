import { useCallback, useEffect, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import {
  clearLocalDiagnostics,
  readLocalDiagnostics,
  subscribeToLocalDiagnostics,
} from "./localDiagnostics";
import type { LocalDiagnostic } from "./localDiagnostics";

export function DiagnosticReportPanel() {
  const [diagnostics, setDiagnostics] = useState<LocalDiagnostic[]>([]);

  const refreshDiagnostics = useCallback(() => {
    void readLocalDiagnostics().then(setDiagnostics);
  }, []);

  useEffect(() => {
    refreshDiagnostics();
    return subscribeToLocalDiagnostics(refreshDiagnostics);
  }, [refreshDiagnostics]);

  async function exportReport(): Promise<void> {
    const report = {
      product: "LifeOS",
      exportedAt: new Date().toISOString(),
      diagnostics,
    };

    await Share.share({
      title: "LifeOS diagnostic report",
      message: JSON.stringify(report, null, 2),
    });
  }

  return (
    <View className="gap-4 rounded-md border border-line bg-surface p-5 tablet:p-6">
      <View className="gap-2">
        <Text className="text-title-l font-semibold text-ink">
          Local diagnostics
        </Text>
        <Text className="text-body-s text-ink-muted">
          Recent errors are stored on this device only. Messages, request
          bodies, credentials, and health values are excluded. Nothing is sent
          automatically.
        </Text>
      </View>
      {diagnostics.length === 0 ? (
        <Text className="text-body-s text-ink-muted">
          No recent diagnostics recorded on this device.
        </Text>
      ) : (
        <View accessibilityLabel="Recent diagnostic events" className="gap-3">
          {diagnostics
            .slice()
            .reverse()
            .map((diagnostic) => (
              <View
                className="gap-1 rounded-sm border border-line p-4"
                key={diagnostic.id}
              >
                <Text className="font-semibold text-ink">
                  {diagnostic.kind === "api_failure"
                    ? `${diagnostic.method ?? "Request"} ${diagnostic.route ?? "unknown route"} failed`
                    : (diagnostic.errorType ?? "Unhandled app error")}
                  {diagnostic.status ? ` (HTTP ${diagnostic.status})` : ""}
                </Text>
                <Text className="text-caption text-ink-muted">
                  {new Date(diagnostic.occurredAt).toLocaleString()}
                </Text>
                {diagnostic.correlationId ? (
                  <Text className="break-all font-mono text-caption text-ink-muted">
                    Correlation ID: {diagnostic.correlationId}
                  </Text>
                ) : null}
              </View>
            ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: diagnostics.length === 0 }}
        className={`min-h-11 justify-center rounded-sm bg-primary px-4 ${diagnostics.length === 0 ? "opacity-50" : "active:opacity-70"}`}
        disabled={diagnostics.length === 0}
        onPress={() => void exportReport()}
      >
        <Text className="text-center text-body-s font-semibold text-on-primary">
          Export diagnostic report
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: diagnostics.length === 0 }}
        className={`min-h-11 justify-center rounded-sm border border-line px-4 ${diagnostics.length === 0 ? "opacity-50" : "active:opacity-70"}`}
        disabled={diagnostics.length === 0}
        onPress={() => void clearLocalDiagnostics()}
      >
        <Text className="text-center text-body-s font-semibold text-ink">
          Clear local diagnostics
        </Text>
      </Pressable>
    </View>
  );
}
