import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { getWeeklyReview, saveWeeklyReview } from "../Routines/routines";
import type { WeeklyReviewSummary } from "../Routines/routines";

export function WeeklyReviewPage() {
  const [summary, setSummary] = useState<WeeklyReviewSummary | null>(null);
  const [notes, setNotes] = useState("");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getWeeklyReview()
      .then((result) => {
        setSummary(result);
        setNotes(result.review?.notes ?? "");
        setFocus(result.review?.next_week_focus ?? "");
      })
      .catch(() => setError("Your weekly review could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveWeeklyReview({
        week_start: summary.week_start,
        notes,
        next_week_focus: focus,
      });
      setSummary(result);
      setSaved(true);
    } catch {
      setError("Your review could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto w-full max-w-5xl pr-1 lg:pr-8"
    >
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Close the loop
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        id="page-title"
      >
        Weekly review
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
        A calm look back across finance, fitness, and nutrition, followed by one
        focus for the week ahead.
      </p>
      {loading && (
        <p className="mt-8" aria-live="polite">
          Loading your review…
        </p>
      )}
      {error && (
        <p
          className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          {error}
        </p>
      )}
      {summary && (
        <>
          <p className="mt-6 text-sm font-medium">
            {formatDate(summary.week_start)} – {formatDate(summary.week_end)}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <SummaryCard title="Finance">
              <p>{summary.finance.transaction_count} transactions</p>
              {summary.finance.totals.length ? (
                summary.finance.totals.map((total) => (
                  <p key={total.currency} className="mt-2">
                    {formatMoney(total.income, total.currency)} in ·{" "}
                    {formatMoney(total.expenses, total.currency)} out
                  </p>
                ))
              ) : (
                <p>No transactions logged.</p>
              )}
            </SummaryCard>
            <SummaryCard title="Fitness">
              <p>{summary.fitness.completed_workouts} workouts completed</p>
              <p className="mt-2">
                {summary.fitness.workout_minutes === null
                  ? "Workout duration not fully recorded."
                  : `${summary.fitness.workout_minutes} minutes active`}
              </p>
            </SummaryCard>
            <SummaryCard title="Nutrition">
              <p>
                {summary.nutrition.meals_logged} meals logged ·{" "}
                {summary.nutrition.planned_meals} planned
              </p>
              <p className="mt-2">
                {summary.nutrition.calories
                  ? `${Math.round(Number(summary.nutrition.calories)).toLocaleString()} kcal recorded`
                  : "No calorie totals recorded."}
              </p>
            </SummaryCard>
          </div>
          <form
            className="mt-5 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8"
            onSubmit={submit}
          >
            <label className="block text-sm font-medium" htmlFor="weekly-notes">
              What went well, and what would you change?
              <textarea
                className={fieldClass}
                id="weekly-notes"
                maxLength={10000}
                onChange={(event) => setNotes(event.currentTarget.value)}
                rows={4}
                value={notes}
              />
            </label>
            <label className="block text-sm font-medium" htmlFor="weekly-focus">
              One focus for next week
              <textarea
                className={fieldClass}
                id="weekly-focus"
                maxLength={2000}
                onChange={(event) => setFocus(event.currentTarget.value)}
                rows={3}
                value={focus}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <button
                className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-wait disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving…" : "Save weekly review"}
              </button>
              {saved && (
                <p
                  className="text-sm text-emerald-700 dark:text-emerald-300"
                  role="status"
                >
                  Review saved.
                </p>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-6 dark:border-white/10 dark:bg-stone-900">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <div className="text-stone-500 dark:text-stone-400">{children}</div>
    </article>
  );
}

const fieldClass =
  "mt-2 block w-full rounded-xl border border-stone-300 bg-white px-3 py-3 font-normal dark:border-white/15 dark:bg-stone-950";
function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
