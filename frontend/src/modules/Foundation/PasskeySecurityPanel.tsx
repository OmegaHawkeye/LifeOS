import { useCallback, useEffect, useState } from "react";
import { Passkeys } from "@laravel/passkeys";
import { usePasskeyRegister } from "@laravel/passkeys/react";
import { apiFetch, initializeCsrfProtection } from "@/api/client";
import { environment } from "@/config/environment";

type Passkey = {
  id: string;
  name: string;
  created_at: string | null;
  last_used_at: string | null;
};

Passkeys.configure({ fetch: { credentials: "include" } });

export function PasskeySecurityPanel() {
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
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Passkey registration failed.",
      );
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
      {passkeys.map((passkey) => (
        <div
          className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 dark:border-white/10"
          key={passkey.id}
        >
          <span className="text-sm font-medium">{passkey.name}</span>
          <button
            className="text-sm font-semibold text-red-700 dark:text-red-300"
            onClick={() => void removePasskey(passkey.id)}
            type="button"
          >
            Remove
          </button>
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
      <button
        className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10"
        disabled={
          isLoading || registration.isLoading || name.trim().length === 0
        }
        onClick={() => void addPasskey()}
        type="button"
      >
        {isLoading || registration.isLoading
          ? "Waiting for your passkey…"
          : "Add passkey"}
      </button>
      {error || registration.error ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {error ?? registration.error}
        </p>
      ) : null}
    </section>
  );
}
