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
      <p className="m-0 text-overline uppercase text-ink-muted">
        Close the loop
      </p>
      <h1
        className="m-0 mt-2 text-balance font-display text-display-m text-ink tablet:text-display-l"
        id="page-title"
      >
        Weekly review
      </h1>
      <p className="mt-3 text-body text-ink-muted">
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
          className="mt-6 rounded-sm bg-danger-soft p-4 text-body-s text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {summary && (
        <>
          <p className="mt-6 text-body-s font-medium">
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
            className="mt-5 space-y-5 rounded-md border border-line bg-surface p-6 shadow-raised sm:p-8"
            onSubmit={submit}
          >
            <label
              className="block text-body-s font-medium"
              htmlFor="weekly-notes"
            >
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
            <label
              className="block text-body-s font-medium"
              htmlFor="weekly-focus"
            >
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
                className="rounded-sm bg-primary px-5 py-3 text-body-s font-semibold text-on-primary disabled:cursor-wait disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? "Saving…" : "Save weekly review"}
              </button>
              {saved && (
                <p className="text-body-s text-primary-text" role="status">
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
    <article className="rounded-md border border-line bg-surface p-5 text-body-s leading-6">
      <h2 className="mb-2 text-body font-semibold">{title}</h2>
      <div className="text-ink-muted">{children}</div>
    </article>
  );
}

const fieldClass =
  "mt-2 block w-full rounded-sm border border-line-strong bg-surface px-3 py-3 font-normal";
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
