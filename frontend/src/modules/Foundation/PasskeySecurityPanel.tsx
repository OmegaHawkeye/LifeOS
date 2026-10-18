import { useCallback, useEffect, useState } from "react";
import { Button } from "@lifeos/ui/button";
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
    <section className="mt-8 space-y-5 rounded-md border border-line bg-surface p-5 sm:p-7">
      <div>
        <h2 className="text-title-m font-semibold">Passkeys</h2>
        <p className="mt-1 text-body-s text-ink-muted">
          Use Apple Passwords, 1Password, or another WebAuthn-compatible
          manager. LifeOS stores only the public key.
        </p>
      </div>
      <label
        className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-4 text-body-s"
        htmlFor="passkeys-enabled"
      >
        <input
          checked={enabled}
          className="mt-0.5 size-4 accent-primary"
          id="passkeys-enabled"
          onChange={(event) => onToggle(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          <span className="block font-medium">Allow passkey sign-in</span>
          <span className="mt-1 block leading-5 text-ink-muted">
            Disable this to keep password and two-factor sign-in as the only
            authentication method. Existing passkeys are not deleted.
          </span>
        </span>
      </label>
      <div
        className={`rounded-md border p-4 text-body-s ${originIsSecure ? "border-primary bg-primary-soft text-primary-text" : "border-warning bg-warning-soft text-warning"}`}
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
          className="flex items-center justify-between gap-4 rounded-sm border border-line p-4"
          key={passkey.id}
        >
          <span className="text-body-s font-medium">{passkey.name}</span>
          <Button
            className="min-h-9 px-3 text-body-s"
            onPress={() => void removePasskey(passkey.id)}
            variant="danger"
          >
            Remove
          </Button>
        </div>
      ))}
      <label
        className="block text-body-s font-medium"
        htmlFor="settings-passkey-name"
      >
        Name this passkey
        <input
          className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none focus:border-focus"
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
        <p className="text-body-s text-danger" role="alert">
          {error ?? registration.error}
        </p>
      ) : null}
    </section>
  );
}
