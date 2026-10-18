import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@lifeos/ui/button";
import type { MobileTwoFactorService } from "./mobileTwoFactorService";
import type { MobilePasskeyService } from "./mobilePasskeyService";
import { PasskeySettingsPanel } from "./PasskeySettingsPanel";
import { DiagnosticReportPanel } from "../diagnostics/DiagnosticReportPanel";

type TwoFactorSettingsScreenProps = {
  onDisabled?: () => void | Promise<void>;
  service: Pick<
    MobileTwoFactorService,
    "getStatus" | "beginSetup" | "confirm" | "disable"
  >;
  passkeyService?: MobilePasskeyService;
};

type Status = "loading" | "enabled" | "disabled" | "error";

export function TwoFactorSettingsScreen({
  onDisabled,
  passkeyService,
  service,
}: TwoFactorSettingsScreenProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [secret, setSecret] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  const reload = useCallback(async () => {
    setStatus("loading");
    try {
      setStatus((await service.getStatus()) ? "enabled" : "disabled");
    } catch {
      setStatus("error");
    }
  }, [service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function beginSetup() {
    setBusy(true);
    setMessage(null);
    try {
      setSecret(await service.beginSetup(password));
      setPassword("");
      setCode("");
    } catch {
      setMessageType("error");
      setMessage(
        "Two-factor setup could not start. Check your password and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    setBusy(true);
    setMessage(null);
    try {
      await service.confirm(code.trim());
      setSecret(null);
      setCode("");
      await reload();
    } catch {
      setMessageType("error");
      setMessage(
        "That code is invalid or expired. Check your authenticator and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      await service.disable(password, code.trim());
      setPassword("");
      setCode("");
      setStatus("disabled");
      setMessageType("success");
      setMessage(
        "Two-factor authentication is disabled. Other mobile sessions were signed out.",
      );
      await onDisabled?.();
    } catch {
      setMessageType("error");
      setMessage(
        "Two-factor authentication could not be disabled. Check your password and code.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-[900px] gap-3 px-4 pb-10 pt-6 tablet:px-6 tablet:pt-8 desktop:px-8"
    >
      <Text className="text-overline uppercase text-ink-muted">
        Keep your account yours
      </Text>
      <Text
        accessibilityRole="header"
        className="text-display-m text-ink tablet:text-display-l"
      >
        Security
      </Text>
      <Text className="mb-2 text-body text-ink-muted">
        Manage authenticator-based two-factor authentication for this LifeOS
        account.
      </Text>

      {status === "loading" ? (
        <View
          accessibilityLabel="Loading security settings"
          className="min-h-[150px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-body-s text-ink-muted">
            Loading security settings…
          </Text>
        </View>
      ) : status === "error" ? (
        <SettingsCard>
          <Text className="text-title-m font-semibold text-ink">
            Security settings unavailable
          </Text>
          <Text className="text-body-s text-ink-muted">
            Check your server connection and retry.
          </Text>
          <Action label="Try again" onPress={() => void reload()} />
        </SettingsCard>
      ) : secret !== null ? (
        <SettingsCard>
          <Text className="text-title-l font-semibold text-ink">
            Finish authenticator setup
          </Text>
          <Text className="text-body-s text-ink-muted">
            Add this key to your authenticator app. The key stays only in this
            screen until setup completes.
          </Text>
          <Text
            selectable
            className="rounded-sm bg-canvas p-4 text-title-m font-semibold text-ink"
          >
            {secret}
          </Text>
          <TextInput
            accessibilityLabel="Authenticator code"
            className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColorClassName="accent-ink-muted"
            {...Platform.select({
              ios: { textContentType: "oneTimeCode" },
              android: { autoComplete: "one-time-code" },
            })}
            value={code}
          />
          <Action
            disabled={busy || code.length !== 6}
            loading={busy}
            label={busy ? "Confirming…" : "Confirm authenticator"}
            onPress={() => void confirmSetup()}
          />
        </SettingsCard>
      ) : status === "enabled" ? (
        <SettingsCard>
          <Text className="text-title-l font-semibold text-ink">
            Two-factor authentication is on
          </Text>
          <Text className="text-body-s text-ink-muted">
            Sign-in requires your password and a current authenticator code.
            Disabling it signs out other mobile sessions.
          </Text>
          <TextInput
            accessibilityLabel="Current password"
            className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
            onChangeText={setPassword}
            placeholder="Current password"
            placeholderTextColorClassName="accent-ink-muted"
            secureTextEntry
            value={password}
          />
          <TextInput
            accessibilityLabel="Authenticator code"
            className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColorClassName="accent-ink-muted"
            {...Platform.select({
              ios: { textContentType: "oneTimeCode" },
              android: { autoComplete: "one-time-code" },
            })}
            value={code}
          />
          <Action
            disabled={busy || password.length === 0 || code.length !== 6}
            loading={busy}
            label={busy ? "Disabling…" : "Disable two-factor authentication"}
            onPress={() => void disable()}
          />
        </SettingsCard>
      ) : (
        <SettingsCard>
          <Text className="text-title-l font-semibold text-ink">
            Two-factor authentication is off
          </Text>
          <Text className="text-body-s text-ink-muted">
            Use an authenticator app to add a second step to password sign-in.
          </Text>
          <TextInput
            accessibilityLabel="Current password"
            className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
            onChangeText={setPassword}
            placeholder="Current password"
            placeholderTextColorClassName="accent-ink-muted"
            secureTextEntry
            value={password}
          />
          <Action
            disabled={busy || password.length === 0}
            loading={busy}
            label={busy ? "Starting…" : "Set up authenticator"}
            onPress={() => void beginSetup()}
          />
        </SettingsCard>
      )}

      {message ? (
        <Text
          accessibilityRole={messageType === "error" ? "alert" : undefined}
          accessibilityLiveRegion={
            messageType === "success" ? "polite" : "assertive"
          }
          className={`rounded-sm p-4 text-body-s ${messageType === "success" ? "bg-primary-soft text-primary-text" : "bg-danger-soft text-danger"}`}
        >
          {message}
        </Text>
      ) : null}
      {passkeyService ? (
        <PasskeySettingsPanel service={passkeyService} />
      ) : null}
      <DiagnosticReportPanel />
    </ScrollView>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="gap-4 rounded-md border border-line bg-surface p-5 tablet:p-6">
      {children}
    </View>
  );
}

function Action({
  disabled = false,
  loading = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  loading?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      className="min-h-11 px-4"
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      variant="primary"
    >
      {label}
    </Button>
  );
}
