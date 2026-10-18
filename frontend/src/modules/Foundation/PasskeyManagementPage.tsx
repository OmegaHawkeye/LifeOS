import { useEffect, useState } from "react";
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
      setError(describePasskeyError(caughtError));
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

  const registrationError = registration.error
    ? describePasskeyError(
        registration.errorInstance ?? new Error(registration.error),
      )
    : null;
  const visibleError = error ?? registrationError;

  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-5 py-12 text-ink">
      <section className="w-full max-w-xl space-y-6 rounded-md border border-line bg-surface p-7 shadow-overlay sm:p-9">
        <div>
          <p className="m-0 text-overline uppercase text-ink-muted">
            LifeOS account security
          </p>
          <h1 className="m-0 mt-2 text-balance font-display text-display-m text-ink">
            Passkeys
          </h1>
          <p className="mt-3 text-body text-ink-muted">
            Passkeys are stored by your device or compatible credential manager,
            such as Apple Passwords or 1Password. LifeOS stores only the public
            key needed to verify sign-ins.
          </p>
        </div>

        {!isReady && !error ? (
          <p aria-live="polite" className="text-body-s text-ink-muted">
            Preparing secure passkey management…
          </p>
        ) : null}

        {passkeys.map((passkey) => (
          <div
            className="flex items-center justify-between gap-3 rounded-sm border border-line p-4"
            key={passkey.id}
          >
            <span className="text-body-s font-medium">{passkey.name}</span>
            <Button
              className="min-h-9 px-3 text-body-s"
              disabled={!isReady}
              onPress={() => void deletePasskey(passkey.id)}
              variant="danger"
            >
              Remove
            </Button>
          </div>
        ))}

        <label className="block text-body-s font-medium" htmlFor="passkey-name">
          Name this passkey
          <input
            autoComplete="off"
            className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none focus:border-focus"
            id="passkey-name"
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="iPhone, MacBook, 1Password…"
            value={name}
          />
        </label>
        <Button
          className="w-full"
          disabled={
            !isReady ||
            isLoading ||
            registration.isLoading ||
            name.trim().length === 0
          }
          loading={registration.isLoading}
          onPress={() => void addPasskey()}
        >
          {isLoading || registration.isLoading
            ? "Waiting for your passkey…"
            : "Add passkey"}
        </Button>

        {message ? (
          <p className="text-body-s text-primary-text" role="status">
            {message}
          </p>
        ) : null}
        {visibleError ? (
          <p className="text-body-s text-danger" role="alert">
            {visibleError}
          </p>
        ) : null}
      </section>
    </main>
  );
}
