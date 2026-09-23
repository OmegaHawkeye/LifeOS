import { useCallback, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import type {
  MobilePasskey,
  MobilePasskeyService,
  MobilePasskeySettings,
} from "./mobilePasskeyService";

export function PasskeySettingsPanel({
  service,
}: {
  service: MobilePasskeyService;
}) {
  const [passkeys, setPasskeys] = useState<MobilePasskey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<MobilePasskeySettings | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [passkeyList, passkeySettings] = await Promise.all([
        service.list(),
        service.getSettings(),
      ]);
      setPasskeys(passkeyList);
      setSettings(passkeySettings);
      setError(null);
    } catch {
      setError("Passkeys could not be loaded from your LifeOS server.");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addPasskey(): Promise<void> {
    setIsBusy(true);
    setError(null);
    try {
      const url = await service.beginManagement();
      await WebBrowser.openAuthSessionAsync(
        url,
        "lifeos://passkey-management",
        {
          preferEphemeralSession: true,
        },
      );
      await reload();
    } catch {
      setError("Passkey setup could not be completed. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function togglePasskeys(enabled: boolean): Promise<void> {
    if (!settings) return;
    setIsBusy(true);
    setError(null);
    try {
      setSettings(await service.updateSettings(enabled));
    } catch {
      setError("Passkey settings could not be saved.");
    } finally {
      setIsBusy(false);
    }
  }

  async function removePasskey(id: string): Promise<void> {
    setIsBusy(true);
    setError(null);
    try {
      await service.remove(id);
      await reload();
    } catch {
      setError("This passkey could not be removed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View className="gap-4 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
      <View>
        <Text className="text-xl font-bold text-lifeos-primary">Passkeys</Text>
        <Text className="mt-1 text-sm leading-[21px] text-lifeos-muted">
          Add a passkey stored by Apple Passwords, 1Password, or another
          compatible credential manager.
        </Text>
      </View>

      {settings ? (
        <View className="gap-3 rounded-2xl border border-lifeos-border p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-sm font-medium text-lifeos-primary">
              Allow passkey sign-in
            </Text>
            <Switch
              accessibilityLabel="Allow passkey sign-in"
              disabled={isBusy}
              onValueChange={(value) => void togglePasskeys(value)}
              value={settings.passkeys_enabled}
            />
          </View>
          <Text className="text-sm leading-[21px] text-lifeos-muted">
            {settings.passkey_origin_is_secure
              ? `Secure origin: ${settings.passkey_origin}`
              : `Passkeys need trusted HTTPS. Current origin: ${settings.passkey_origin}`}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator accessibilityLabel="Loading passkeys" />
      ) : passkeys.length === 0 ? (
        <Text className="text-sm text-lifeos-muted">
          No passkeys added yet.
        </Text>
      ) : (
        passkeys.map((passkey) => (
          <View
            className="flex-row items-center justify-between gap-3 rounded-xl border border-lifeos-border p-3"
            key={passkey.id}
          >
            <Text className="flex-1 text-sm font-medium text-lifeos-primary">
              {passkey.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy }}
              disabled={isBusy}
              onPress={() => void removePasskey(passkey.id)}
            >
              <Text className="text-sm font-semibold text-red-700">Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-red-700">
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy }}
        className={`min-h-11 justify-center rounded-xl bg-lifeos-accent px-4 ${isBusy ? "opacity-50" : "active:opacity-70"}`}
        disabled={isBusy}
        onPress={() => void addPasskey()}
      >
        <Text className="text-center text-sm font-semibold text-lifeos-accent-ink">
          {isBusy ? "Opening secure setup…" : "Add passkey"}
        </Text>
      </Pressable>
    </View>
  );
}
