import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
          Your private home dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Set up your owner account
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
          Create the single owner account for this LifeOS installation. Your
          personal data stays on this server.
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium" htmlFor="owner-name">
            Name
            <input
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
              id="owner-name"
              name="name"
              onChange={(event) => setName(event.currentTarget.value)}
              required
              value={name}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="owner-email">
            Email
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
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
              className="block text-sm font-medium"
              htmlFor="owner-password"
            >
              Password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
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
              className="mt-1 block text-xs font-normal text-stone-500 dark:text-stone-400"
            >
              Use at least 12 characters.
            </span>
          </div>
          <label
            className="block text-sm font-medium"
            htmlFor="owner-password-confirmation"
          >
            Confirm password
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950"
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
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
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
