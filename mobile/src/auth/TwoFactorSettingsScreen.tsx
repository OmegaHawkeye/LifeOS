import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { MobileTwoFactorService } from "./mobileTwoFactorService";
import type { MobilePasskeyService } from "./mobilePasskeyService";
import { PasskeySettingsPanel } from "./PasskeySettingsPanel";

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
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[900px] gap-3 px-5 pb-12 pt-8 md:px-9 md:pt-10">
      <Text className="text-sm font-semibold text-lifeos-accent-dark">
        Keep your account yours
      </Text>
      <Text className="text-[38px] font-bold tracking-[-0.7px] text-lifeos-primary">
        Security
      </Text>
      <Text className="mb-2 text-[15px] leading-[22px] text-lifeos-muted">
        Manage authenticator-based two-factor authentication for this LifeOS
        account.
      </Text>

      {status === "loading" ? (
        <View
          accessibilityLabel="Loading security settings"
          className="min-h-[150px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-sm text-lifeos-muted">
            Loading security settings…
          </Text>
        </View>
      ) : status === "error" ? (
        <SettingsCard>
          <Text className="text-lg font-bold text-lifeos-primary">
            Security settings unavailable
          </Text>
          <Text className="text-sm text-lifeos-muted">
            Check your server connection and retry.
          </Text>
          <Action label="Try again" onPress={() => void reload()} />
        </SettingsCard>
      ) : secret !== null ? (
        <SettingsCard>
          <Text className="text-xl font-bold text-lifeos-primary">
            Finish authenticator setup
          </Text>
          <Text className="text-sm leading-[21px] text-lifeos-muted">
            Add this key to your authenticator app. The key stays only in this
            screen until setup completes.
          </Text>
          <Text
            selectable
            className="rounded-xl bg-lifeos-background p-4 text-lg font-bold tracking-[1.5px] text-lifeos-primary"
          >
            {secret}
          </Text>
          <TextInput
            accessibilityLabel="Authenticator code"
            className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColor="#758078"
            {...Platform.select({
              ios: { textContentType: "oneTimeCode" },
              android: { autoComplete: "one-time-code" },
            })}
            value={code}
          />
          <Action
            disabled={busy || code.length !== 6}
            label={busy ? "Confirming…" : "Confirm authenticator"}
            onPress={() => void confirmSetup()}
          />
        </SettingsCard>
      ) : status === "enabled" ? (
        <SettingsCard>
          <Text className="text-xl font-bold text-lifeos-primary">
            Two-factor authentication is on
          </Text>
          <Text className="text-sm leading-[21px] text-lifeos-muted">
            Sign-in requires your password and a current authenticator code.
            Disabling it signs out other mobile sessions.
          </Text>
          <TextInput
            accessibilityLabel="Current password"
            className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
            onChangeText={setPassword}
            placeholder="Current password"
            placeholderTextColor="#758078"
            secureTextEntry
            value={password}
          />
          <TextInput
            accessibilityLabel="Authenticator code"
            className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColor="#758078"
            {...Platform.select({
              ios: { textContentType: "oneTimeCode" },
              android: { autoComplete: "one-time-code" },
            })}
            value={code}
          />
          <Action
            disabled={busy || password.length === 0 || code.length !== 6}
            label={busy ? "Disabling…" : "Disable two-factor authentication"}
            onPress={() => void disable()}
          />
        </SettingsCard>
      ) : (
        <SettingsCard>
          <Text className="text-xl font-bold text-lifeos-primary">
            Two-factor authentication is off
          </Text>
          <Text className="text-sm leading-[21px] text-lifeos-muted">
            Use an authenticator app to add a second step to password sign-in.
          </Text>
          <TextInput
            accessibilityLabel="Current password"
            className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
            onChangeText={setPassword}
            placeholder="Current password"
            placeholderTextColor="#758078"
            secureTextEntry
            value={password}
          />
          <Action
            disabled={busy || password.length === 0}
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
          className={`rounded-xl p-4 text-sm ${messageType === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {message}
        </Text>
      ) : null}
      {passkeyService ? (
        <PasskeySettingsPanel service={passkeyService} />
      ) : null}
    </ScrollView>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="gap-4 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
      {children}
    </View>
  );
}

function Action({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`min-h-11 justify-center rounded-xl bg-lifeos-accent px-4 ${disabled ? "opacity-50" : "active:opacity-70"}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="text-center text-sm font-semibold text-lifeos-accent-ink">
        {label}
      </Text>
    </Pressable>
  );
}
