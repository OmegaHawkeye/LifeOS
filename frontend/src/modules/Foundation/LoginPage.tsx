import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Passkeys } from "@laravel/passkeys";
import { usePasskeyVerify } from "@laravel/passkeys/react";
import { apiFetch, initializeCsrfProtection } from "@/api/client";
import { environment } from "@/config/environment";
import { useAuth } from "./auth-context";

Passkeys.configure({ fetch: { credentials: "include" } });

export function LoginPage() {
  const { pendingTwoFactor, refreshOwner, signIn, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPasskey, setIsPreparingPasskey] = useState(true);
  const mobilePasskeyStarted = useRef(false);
  const mobilePasskeyState = new URLSearchParams(window.location.search).get(
    "mobile_passkey_state",
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await initializeCsrfProtection();
        if (mobilePasskeyState) {
          const response = await apiFetch(
            `${environment.apiBaseUrl}/api/v1/mobile/passkeys/prepare`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state: mobilePasskeyState }),
            },
          );
          if (!response.ok) {
            throw new Error("This passkey sign-in request has expired.");
          }
        }
      } catch (caughtError) {
        if (mounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "LifeOS could not prepare passkey sign-in.",
          );
        }
      } finally {
        if (mounted) {
          setIsPreparingPasskey(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mobilePasskeyState]);

  const passkeyLogin = usePasskeyVerify({
    autofill: !isPreparingPasskey && !mobilePasskeyState && !pendingTwoFactor,
    routes: {
      options: `${environment.apiBaseUrl}/passkeys/login/options`,
      submit: `${environment.apiBaseUrl}/passkeys/login`,
    },
    onSuccess: (result) => {
      if (!mobilePasskeyState) {
        void refreshOwner()
          .then(() =>
            navigate(
              result.redirect
                ? new URL(result.redirect, window.location.origin).pathname
                : "/dashboard",
              { replace: true },
            ),
          )
          .catch((caughtError) => {
            setError(
              caughtError instanceof Error
                ? caughtError.message
                : "LifeOS could not complete passkey sign-in.",
            );
          });
        return;
      }

      void (async () => {
        try {
          const response = await apiFetch(
            `${environment.apiBaseUrl}/api/v1/mobile/passkeys/complete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state: mobilePasskeyState }),
            },
          );
          if (!response.ok) {
            throw new Error("LifeOS could not complete passkey sign-in.");
          }
          const payload = (await response.json()) as {
            data?: { callback_url?: string };
          };
          if (!payload.data?.callback_url) {
            throw new Error("LifeOS returned an invalid passkey response.");
          }
          window.location.assign(payload.data.callback_url);
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "LifeOS could not complete passkey sign-in.",
          );
        }
      })();
    },
  });
  const { isSupported: passkeySupported, verify: verifyPasskey } = passkeyLogin;

  useEffect(() => {
    if (
      !mobilePasskeyState ||
      isPreparingPasskey ||
      !passkeySupported ||
      mobilePasskeyStarted.current
    ) {
      return;
    }

    mobilePasskeyStarted.current = true;
    void initializeCsrfProtection()
      .then(() => verifyPasskey())
      .catch(() => {
        // The passkey hook exposes the actionable error to the page.
      });
  }, [
    isPreparingPasskey,
    mobilePasskeyState,
    passkeySupported,
    verifyPasskey,
  ]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (pendingTwoFactor) {
        await verifyTwoFactor(authenticatorCode);
        navigate("/dashboard", { replace: true });
      } else {
        await signIn(email, password);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Sign-in failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const isSettingUpTwoFactor = pendingTwoFactor?.status === "setup_required";

  return (
    <main className="grid min-h-svh place-items-center bg-stone-100 px-5 py-12 text-stone-950 dark:bg-stone-950 dark:text-stone-100">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 dark:border-white/10 dark:bg-stone-900 sm:p-9">
        <div className="mb-9 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-2xl bg-emerald-400 text-sm font-bold text-stone-950"
          >
            L
          </span>
          <span className="text-lg font-semibold tracking-tight">LifeOS</span>
        </div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Your private workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {pendingTwoFactor
            ? isSettingUpTwoFactor
              ? "Set up two-factor authentication"
              : "Two-factor verification"
            : "Sign in"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
          {pendingTwoFactor
            ? "Use an authenticator app that supports time-based one-time passwords (TOTP)."
            : "This LifeOS account is private. Sign in with your owner credentials to continue."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          {!pendingTwoFactor && (
            <>
              <label className="block text-sm font-medium" htmlFor="email">
                Email
                <input
                  autoComplete="username"
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label className="block text-sm font-medium" htmlFor="password">
                Password
                <input
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
                  id="password"
                  name="password"
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            </>
          )}
          {isSettingUpTwoFactor && (
            <div className="rounded-2xl border border-emerald-700/20 bg-emerald-50 p-4 text-sm dark:border-emerald-300/20 dark:bg-emerald-950/30">
              <p className="font-medium">
                Add this key to your authenticator app
              </p>
              <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-stone-950">
                {pendingTwoFactor.secret}
              </code>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Keep the key private. LifeOS encrypts it when stored.
              </p>
            </div>
          )}
          {pendingTwoFactor && (
            <label
              className="block text-sm font-medium"
              htmlFor="authenticator-code"
            >
              6-digit authenticator code
              <input
                autoComplete="one-time-code"
                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.35em] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
                id="authenticator-code"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                onChange={(event) =>
                  setAuthenticatorCode(
                    event.currentTarget.value.replace(/\D/g, ""),
                  )
                }
                pattern="[0-9]{6}"
                required
                value={authenticatorCode}
              />
            </label>
          )}
          {error && (
            <p
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Verifying…"
              : pendingTwoFactor
                ? isSettingUpTwoFactor
                  ? "Confirm authenticator"
                  : "Verify and sign in"
                : "Sign in"}
          </button>
        </form>
        {!pendingTwoFactor && (
          <div className="mt-4 space-y-2">
            <button
              className="w-full rounded-xl border border-stone-300 px-4 py-3 font-semibold transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
              disabled={
                !passkeyLogin.isSupported ||
                passkeyLogin.isLoading ||
                isPreparingPasskey
              }
              onClick={() =>
                void initializeCsrfProtection().then(() =>
                  passkeyLogin.verify(),
                )
              }
              type="button"
            >
              {isPreparingPasskey
                ? "Preparing secure sign-in…"
                : passkeyLogin.isLoading
                  ? "Waiting for passkey…"
                  : "Sign in with a passkey"}
            </button>
            {passkeyLogin.error && (
              <p
                className="text-sm text-red-700 dark:text-red-300"
                role="alert"
              >
                {passkeyLogin.error}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
