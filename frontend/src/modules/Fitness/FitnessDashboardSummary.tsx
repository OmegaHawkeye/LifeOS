import { useEffect, useState } from "react";
import {
  getFitnessDashboard,
  startRecommendedWorkout,
} from "./fitnessDashboard";
import type { FitnessDashboard } from "./fitnessDashboard";

export function FitnessDashboardSummary({
  onWorkoutStarted,
}: {
  onWorkoutStarted: () => void;
}) {
  const [dashboard, setDashboard] = useState<FitnessDashboard | null>(null);
  const [error, setError] = useState(false);
  const [starting, setStarting] = useState(false);

  async function refresh() {
    setDashboard(await getFitnessDashboard());
  }

  useEffect(() => {
    let active = true;
    getFitnessDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function startWorkout(templateId: number) {
    setStarting(true);
    try {
      await startRecommendedWorkout(templateId);
      await refresh();
      setError(false);
      onWorkoutStarted();
    } catch {
      setError(true);
    } finally {
      setStarting(false);
    }
  }

  if (!dashboard) {
    return (
      <section aria-labelledby="fitness-dashboard-title" className={panelClass}>
        <h2 className="text-xl font-semibold" id="fitness-dashboard-title">
          Your fitness at a glance
        </h2>
        <p
          className="mt-3 text-sm text-stone-500"
          role={error ? "alert" : "status"}
        >
          {error
            ? "Your fitness summary could not be loaded. Please try again later."
            : "Loading your fitness summary…"}
        </p>
      </section>
    );
  }

  const nextWorkout = dashboard.next_workout;

  return (
    <section aria-labelledby="fitness-dashboard-title" className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Your progress, in context
          </p>
          <h2
            className="mt-1 text-2xl font-semibold"
            id="fitness-dashboard-title"
          >
            Fitness overview
          </h2>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {dashboard.weekly_workouts.completed} workouts this week ·{" "}
          {dashboard.weekly_workouts.streak_days} consecutive workout days
        </p>
      </div>

      {error && (
        <p
          className="mt-4 text-sm text-rose-700 dark:text-rose-300"
          role="alert"
        >
          The recommended workout could not be started. Try again.
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <article className={cardClass}>
          <h3 className="font-semibold">Weekly rhythm</h3>
          <p className="mt-2 text-2xl font-semibold">
            {dashboard.weekly_workouts.completed} /{" "}
            {dashboard.weekly_workouts.planned}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            workouts logged · {dashboard.weekly_workouts.missed} planned session
            {dashboard.weekly_workouts.missed === 1 ? "" : "s"} still open to
            adjust
          </p>
        </article>

        <article className={cardClass}>
          <h3 className="font-semibold">Body trends · 90 days</h3>
          {dashboard.measurement_trends.length ? (
            <ul className="mt-3 space-y-2">
              {dashboard.measurement_trends.slice(0, 3).map((trend) => (
                <li
                  className="flex items-baseline justify-between gap-2 text-sm"
                  key={`${trend.metric_type}-${trend.unit}`}
                >
                  <span className="capitalize text-stone-500 dark:text-stone-400">
                    {trend.metric_type.replaceAll("_", " ")}
                  </span>
                  <span className="text-right font-medium">
                    {trend.latest_value} {trend.unit} ·{" "}
                    {directionLabel(trend.direction)}{" "}
                    {formatMagnitude(trend.change)} {trend.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Add a body measurement to start a trend.
            </p>
          )}
        </article>

        <article className={cardClass}>
          <h3 className="font-semibold">Personal records</h3>
          {dashboard.personal_records.length ? (
            <ul className="mt-3 space-y-2">
              {dashboard.personal_records.slice(0, 3).map((record) => (
                <li
                  className="text-sm"
                  key={`${record.exercise_id}-${record.weight_unit}`}
                >
                  <span className="font-medium">{record.exercise_name}</span>
                  <span className="ml-2 text-stone-500 dark:text-stone-400">
                    {record.weight} {record.weight_unit}
                    {record.reps === null ? "" : ` × ${record.reps}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Completed workouts will build your record list.
            </p>
          )}
        </article>

        <article className={cardClass}>
          <h3 className="font-semibold">Next up</h3>
          {nextWorkout ? (
            <>
              <p className="mt-2 font-medium">{nextWorkout.name}</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {nextWorkout.scheduled_for
                  ? `Planned for ${formatDate(nextWorkout.scheduled_for)}`
                  : "From your workout plans"}
              </p>
              <button
                className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={starting}
                onClick={() => void startWorkout(nextWorkout.id)}
                type="button"
              >
                {starting ? "Starting…" : "Start this workout"}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Create a workout plan to get a next-session suggestion.
            </p>
          )}
        </article>
      </div>

      {dashboard.active_goals.length > 0 && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Active fitness goals"
        >
          {dashboard.active_goals.map((goal) => (
            <span
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
              key={goal.id}
            >
              {goal.metric_type.replaceAll("_", " ")} goal · {goal.target_value}{" "}
              {goal.unit}
              {goal.target_date ? ` by ${formatDate(goal.target_date)}` : ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function formatMagnitude(value: string): string {
  const amount = Number(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    Math.abs(amount),
  );
}

function directionLabel(direction: "up" | "down" | "steady"): string {
  return direction === "steady" ? "steady" : direction;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

const panelClass =
  "mt-7 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-6";
const cardClass = "rounded-2xl bg-stone-50 p-4 dark:bg-white/5 sm:p-5";
