import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "@lifeos/ui/app-nav";
import { Button } from "@lifeos/ui/button";
import { useAuth } from "./auth-context";

export function InitialSetupPage() {
  const { createInitialOwner } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canCreateOwner =
    name.trim().length > 0 &&
    email.trim().includes("@") &&
    password.length >= 12 &&
    password === passwordConfirmation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createInitialOwner(name.trim(), email.trim(), password);
      navigate("/login", { replace: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "LifeOS could not create the owner account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-5 py-12 text-ink">
      <section className="w-full max-w-md rounded-md border border-line bg-surface p-7 shadow-overlay sm:p-9">
        <div className="mb-9 flex items-center gap-3">
          <LogoMark size={40} />
          <span className="text-title-m text-ink">LifeOS</span>
        </div>
        <p className="m-0 text-overline uppercase text-ink-muted">
          Your private home dashboard
        </p>
        <h1 className="m-0 mt-2 text-balance font-display text-display-m text-ink">
          Set up your owner account
        </h1>
        <p className="mt-3 text-body text-ink-muted">
          Create the single owner account for this LifeOS installation. Your
          personal data stays on this server.
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-body-s font-medium" htmlFor="owner-name">
            Name
            <input
              autoComplete="name"
              className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
              id="owner-name"
              name="name"
              onChange={(event) => setName(event.currentTarget.value)}
              required
              value={name}
            />
          </label>
          <label
            className="block text-body-s font-medium"
            htmlFor="owner-email"
          >
            Email
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
              id="owner-email"
              name="email"
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <div>
            <label
              className="block text-body-s font-medium"
              htmlFor="owner-password"
            >
              Password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
              id="owner-password"
              aria-describedby="owner-password-hint"
              minLength={12}
              name="password"
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              type="password"
              value={password}
            />
            <span
              id="owner-password-hint"
              className="mt-1 block text-caption font-normal text-ink-muted"
            >
              Use at least 12 characters.
            </span>
          </div>
          <label
            className="block text-body-s font-medium"
            htmlFor="owner-password-confirmation"
          >
            Confirm password
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-body outline-none transition focus:border-focus focus:ring-4 focus:ring-focus"
              id="owner-password-confirmation"
              name="password_confirmation"
              onChange={(event) =>
                setPasswordConfirmation(event.currentTarget.value)
              }
              required
              type="password"
              value={passwordConfirmation}
            />
          </label>
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
            disabled={!canCreateOwner || isSubmitting}
            loading={isSubmitting}
            type="submit"
          >
            Create owner account
          </Button>
        </form>
      </section>
    </main>
  );
}
