import { useEffect, useState } from "react";
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

const passkeyRoutes = {
  options: `${environment.apiBaseUrl}/user/passkeys/options`,
  submit: `${environment.apiBaseUrl}/user/passkeys`,
};

export function PasskeyManagementPage() {
  const mobileReturn =
    new URLSearchParams(window.location.search).get("return") === "mobile";
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reloadPasskeys() {
    const response = await apiFetch(
      `${environment.apiBaseUrl}/api/v1/security/passkeys`,
    );
    if (!response.ok) {
      throw new Error(
        `Passkeys could not be loaded (HTTP ${response.status}).`,
      );
    }
    const payload = (await response.json()) as { data: Passkey[] };
    setPasskeys(payload.data);
  }

  const registration = usePasskeyRegister({
    routes: passkeyRoutes,
    onSuccess: () => {
      setMessage("Passkey added to this LifeOS account.");
      setName("");
      if (mobileReturn) {
        window.location.assign("lifeos://passkey-management?status=registered");
        return;
      }
      void reloadPasskeys();
    },
  });

  useEffect(() => {
    let mounted = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const handoffToken = fragment.get("token");
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    void (async () => {
      try {
        await initializeCsrfProtection();
        if (handoffToken) {
          const response = await apiFetch(
            `${environment.apiBaseUrl}/api/v1/mobile/passkeys/management/redeem`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: handoffToken }),
            },
          );
          if (!response.ok) {
            throw new Error(
              `This secure passkey setup link could not be redeemed (HTTP ${response.status}).`,
            );
          }
        }
        await reloadPasskeys();
        if (mounted) {
          setIsReady(true);
        }
      } catch (caughtError) {
        if (mounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Passkey management is unavailable.",
          );
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function addPasskey() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
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

  async function deletePasskey(id: string) {
    setError(null);
    try {
      const response = await apiFetch(
        `${environment.apiBaseUrl}/api/v1/security/passkeys/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Passkey could not be removed.");
      }
      await reloadPasskeys();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Passkey could not be removed.",
      );
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-stone-100 px-5 py-12 text-stone-950 dark:bg-stone-950 dark:text-stone-100">
      <section className="w-full max-w-xl space-y-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 dark:border-white/10 dark:bg-stone-900 sm:p-9">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            LifeOS account security
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Passkeys
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
            Passkeys are stored by your device or compatible credential manager,
            such as Apple Passwords or 1Password. LifeOS stores only the public
            key needed to verify sign-ins.
          </p>
        </div>

        {!isReady && !error ? (
          <p aria-live="polite" className="text-sm text-stone-500">
            Preparing secure passkey management…
          </p>
        ) : null}

        {passkeys.map((passkey) => (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 dark:border-white/10"
            key={passkey.id}
          >
            <span className="text-sm font-medium">{passkey.name}</span>
            <button
              className="text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
              disabled={!isReady}
              onClick={() => void deletePasskey(passkey.id)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}

        <label className="block text-sm font-medium" htmlFor="passkey-name">
          Name this passkey
          <input
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-stone-950"
            id="passkey-name"
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="iPhone, MacBook, 1Password…"
            value={name}
          />
        </label>
        <button
          className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            !isReady ||
            isLoading ||
            registration.isLoading ||
            name.trim().length === 0
          }
          onClick={() => void addPasskey()}
          type="button"
        >
          {isLoading || registration.isLoading
            ? "Waiting for your passkey…"
            : "Add passkey"}
        </button>

        {message ? (
          <p
            className="text-sm text-emerald-700 dark:text-emerald-300"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {error || registration.error ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {error ?? registration.error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
