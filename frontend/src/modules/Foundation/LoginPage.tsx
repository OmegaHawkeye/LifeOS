import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@lifeos/ui/app-nav";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@lifeos/ui/button";
import { Passkeys } from "@laravel/passkeys";
import { usePasskeyVerify } from "@laravel/passkeys/react";
import { apiFetch, initializeCsrfProtection } from "@/api/client";
import { environment } from "@/config/environment";
import { describePasskeyError } from "./passkeyErrors";
import { mobilePasskeyResponseError } from "./mobilePasskeyErrors";
import { useAuth } from "./auth-context";
import { DiagnosticReportPanel } from "@/diagnostics/DiagnosticReportPanel";

Passkeys.configure({ fetch: { credentials: "include" } });

export function LoginPage() {
  const { pendingTwoFactor, refreshOwner, signIn, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPasskey, setIsPreparingPasskey] = useState(true);
  const [isMobilePasskeyPrepared, setIsMobilePasskeyPrepared] = useState(false);
  const mobilePasskeyStarted = useRef(false);
  const mobilePasskeyPreparation = useRef<Promise<void> | null>(null);
  const mobilePasskeyState = new URLSearchParams(window.location.search).get(
    "mobile_passkey_state",
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await initializeCsrfProtection();
        if (mobilePasskeyState) {
          const preparation = (mobilePasskeyPreparation.current ??=
            (async () => {
              const response = await apiFetch(
                `${environment.apiBaseUrl}/api/v1/mobile/passkeys/prepare`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ state: mobilePasskeyState }),
                },
              );
              if (!response.ok) {
                throw await mobilePasskeyResponseError(
                  response,
                  "LifeOS could not prepare passkey sign-in.",
                );
              }
            })());

          await preparation;
          if (mounted) {
            setIsMobilePasskeyPrepared(true);
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
            throw await mobilePasskeyResponseError(
              response,
              "LifeOS could not complete passkey sign-in.",
            );
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
  const passkeyLoginError = passkeyLogin.error
    ? describePasskeyError(
        passkeyLogin.errorInstance ?? new Error(passkeyLogin.error),
      )
    : null;

  useEffect(() => {
    if (
      !mobilePasskeyState ||
      isPreparingPasskey ||
      !isMobilePasskeyPrepared ||
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
    isMobilePasskeyPrepared,
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
    <main className="grid min-h-svh place-items-center bg-canvas px-5 py-12 text-ink">
      <section className="w-full max-w-md rounded-md border border-line bg-surface p-7 shadow-overlay sm:p-9">
        <div className="mb-9 flex items-center gap-3">
          <LogoMark size={40} />
          <span className="text-title-m text-ink">LifeOS</span>
        </div>
        <p className="m-0 text-overline uppercase text-ink-muted">
          Your private workspace
        </p>
        <h1 className="m-0 mt-2 text-balance font-display text-display-m text-ink">
          {pendingTwoFactor
            ? isSettingUpTwoFactor
              ? "Set up two-factor authentication"
              : "Two-factor verification"
            : "Sign in"}
        </h1>
        <p className="mt-3 text-body text-ink-muted">
          {pendingTwoFactor
            ? "Use an authenticator app that supports time-based one-time passwords (TOTP)."
            : "This LifeOS account is private. Sign in with your owner credentials to continue."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          {!pendingTwoFactor && (
            <>
              <label className="block text-body-s font-medium" htmlFor="email">
                Email
                <input
                  autoComplete="username webauthn"
                  className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label
                className="block text-body-s font-medium"
                htmlFor="password"
              >
                Password
                <input
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
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
            <div className="rounded-md border border-primary bg-primary-soft p-4 text-body-s">
              <p className="font-medium">
                Add this key to your authenticator app
              </p>
              <code className="mt-2 block break-all rounded-sm bg-surface px-3 py-2 font-mono text-caption">
                {pendingTwoFactor.secret}
              </code>
              <p className="mt-2 text-ink-muted">
                Keep the key private. LifeOS encrypts it when stored.
              </p>
            </div>
          )}
          {pendingTwoFactor && (
            <label
              className="block text-body-s font-medium"
              htmlFor="authenticator-code"
            >
              6-digit authenticator code
              <input
                autoComplete="one-time-code"
                className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-center font-mono text-title-m tracking-[0.35em] outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
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
              className="rounded-sm bg-danger-soft px-4 py-3 text-body-s text-danger"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button
            className="w-full"
            disabled={
              isSubmitting ||
              (pendingTwoFactor
                ? authenticatorCode.length !== 6
                : email.trim().length === 0 || password.length === 0)
            }
            loading={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Verifying…"
              : pendingTwoFactor
                ? isSettingUpTwoFactor
                  ? "Confirm authenticator"
                  : "Verify and sign in"
                : "Sign in"}
          </Button>
        </form>
        {!pendingTwoFactor && (
          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              disabled={
                !passkeyLogin.isSupported ||
                passkeyLogin.isLoading ||
                isPreparingPasskey ||
                Boolean(mobilePasskeyState && !isMobilePasskeyPrepared)
              }
              onPress={() =>
                void initializeCsrfProtection().then(() =>
                  passkeyLogin.verify(),
                )
              }
              variant="secondary"
            >
              {isPreparingPasskey
                ? "Preparing secure sign-in…"
                : passkeyLogin.isLoading
                  ? "Waiting for passkey…"
                  : "Sign in with a passkey"}
            </Button>
            {passkeyLoginError && (
              <p className="text-body-s text-danger" role="alert">
                {passkeyLoginError}
              </p>
            )}
          </div>
        )}
        <DiagnosticReportPanel />
      </section>
    </main>
  );
}
