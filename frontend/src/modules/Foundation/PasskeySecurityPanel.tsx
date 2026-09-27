import { useCallback, useEffect, useState } from "react";
import { Button } from "@lifeos/ui/button";
import { Switch } from "@lifeos/ui/switch";
import { Passkeys } from "@laravel/passkeys";
import { usePasskeyRegister } from "@laravel/passkeys/react";
import { apiFetch, initializeCsrfProtection } from "@/api/client";
import { environment } from "@/config/environment";
import { describePasskeyError } from "./passkeyErrors";

type Passkey = {
  id: string;
  name: string;
  created_at: string | null;
  last_used_at: string | null;
};

Passkeys.configure({ fetch: { credentials: "include" } });

export function PasskeySecurityPanel({
  enabled,
  origin,
  originIsSecure,
  onToggle,
}: {
  enabled: boolean;
  origin: string;
  originIsSecure: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    const response = await apiFetch(
      `${environment.apiBaseUrl}/api/v1/security/passkeys`,
    );
    if (!response.ok) {
      throw new Error("Passkeys could not be loaded.");
    }
    const payload = (await response.json()) as { data: Passkey[] };
    setPasskeys(payload.data);
  }, []);

  const registration = usePasskeyRegister({
    routes: {
      options: `${environment.apiBaseUrl}/user/passkeys/options`,
      submit: `${environment.apiBaseUrl}/user/passkeys`,
    },
    onSuccess: () => {
      setName("");
      void reload();
    },
  });

  useEffect(() => {
    // Load the owner's registered credentials when security settings mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload().catch(() => setError("Passkeys could not be loaded."));
  }, [reload]);

  async function addPasskey() {
    setIsLoading(true);
    setError(null);
    try {
      await initializeCsrfProtection();
      await registration.register(name.trim());
    } catch (caughtError) {
      setError(describePasskeyError(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  async function removePasskey(id: string) {
    setError(null);
    try {
      const response = await apiFetch(
        `${environment.apiBaseUrl}/api/v1/security/passkeys/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Passkey could not be removed.");
      }
      await reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Passkey could not be removed.",
      );
    }
  }

  return (
    <section className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-stone-900 sm:p-7">
      <div>
        <h2 className="text-lg font-semibold">Passkeys</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Use Apple Passwords, 1Password, or another WebAuthn-compatible
          manager. LifeOS stores only the public key.
        </p>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 p-4 text-sm dark:border-white/10">
        <div>
          <p className="font-medium">Allow passkey sign-in</p>
          <p className="mt-1 leading-5 text-stone-500 dark:text-stone-400">
            Disable this to keep password and two-factor sign-in as the only
            authentication method. Existing passkeys are not deleted.
          </p>
        </div>
        <Switch
          accessibilityLabel="Allow passkey sign-in"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>
      <div
        className={`rounded-2xl border p-4 text-sm ${originIsSecure ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-200"}`}
      >
        <p className="font-medium">WebAuthn origin</p>
        <p className="mt-1 break-all">{origin}</p>
        <p className="mt-1">
          {originIsSecure
            ? "Trusted HTTPS is configured for passkeys."
            : "Passkeys require HTTPS on self-hosted installations. Configure a trusted certificate and stable local hostname before enrolling one."}
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Choose a stable hostname that resolves on every device.</li>
          <li>Terminate HTTPS at your home server or reverse proxy.</li>
          <li>Restart LifeOS after changing the server URL or certificate.</li>
        </ol>
        <p className="mt-2">
          Changing this origin later may invalidate existing passkeys.
        </p>
      </div>
      {passkeys.map((passkey) => (
        <div
          className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 dark:border-white/10"
          key={passkey.id}
        >
          <span className="text-sm font-medium">{passkey.name}</span>
          <Button
            className="min-h-9 px-3 text-sm"
            onPress={() => void removePasskey(passkey.id)}
            variant="danger"
          >
            Remove
          </Button>
        </div>
      ))}
      <label
        className="block text-sm font-medium"
        htmlFor="settings-passkey-name"
      >
        Name this passkey
        <input
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-stone-950"
          id="settings-passkey-name"
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="iPhone, MacBook, 1Password…"
          value={name}
        />
      </label>
      <Button
        className="px-5"
        disabled={
          isLoading || registration.isLoading || name.trim().length === 0
        }
        loading={registration.isLoading}
        onPress={() => void addPasskey()}
        variant="secondary"
      >
        {isLoading || registration.isLoading
          ? "Waiting for your passkey…"
          : "Add passkey"}
      </Button>
      {error || registration.error ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {error ?? registration.error}
        </p>
      ) : null}
    </section>
  );
}
