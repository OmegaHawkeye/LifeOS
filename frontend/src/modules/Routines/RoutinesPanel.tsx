import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  completeRoutine,
  createRoutine,
  getRoutineOverview,
  snoozeRoutine,
} from "./routines";
import type { CreateRoutineInput, RoutineOverview } from "./routines";

export function RoutinesPanel() {
  const [overview, setOverview] = useState<RoutineOverview | null>(null);
  const [title, setTitle] = useState("");
  const [domain, setDomain] =
    useState<CreateRoutineInput["domain"]>("personal");
  const [frequency, setFrequency] =
    useState<CreateRoutineInput["frequency"]>("daily");
  const [day, setDay] = useState(1);
  const [reminderTime, setReminderTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setOverview(await getRoutineOverview());
      setError(null);
    } catch {
      setError("Today’s routines could not be loaded.");
    }
  }

  useEffect(() => {
    let active = true;
    const refreshOverview = () => {
      getRoutineOverview()
        .then((result) => {
          if (active) setOverview(result);
        })
        .catch(() => {
          if (active) setError("Today’s routines could not be loaded.");
        });
    };
    refreshOverview();
    const interval = window.setInterval(refreshOverview, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createRoutine({
        title: title.trim(),
        domain,
        frequency,
        ...(frequency === "weekly" ? { days_of_week: [day] } : {}),
        ...(reminderTime ? { reminder_time: reminderTime } : {}),
      });
      setTitle("");
      await reload();
    } catch {
      setError("Routine could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRoutine(action: "complete" | "snooze", id: number) {
    setBusy(true);
    setError(null);
    try {
      if (action === "complete") await completeRoutine(id);
      else await snoozeRoutine(id);
      await reload();
    } catch {
      setError("That routine could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Small rhythms, less noise
          </p>
          <h2 className="mt-1 text-xl font-semibold">Routines</h2>
        </div>
        <Link
          className="text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
          to="/review"
        >
          Open weekly review
        </Link>
      </div>

      {overview && !overview.notifications_enabled && (
        <p className="mt-4 rounded-2xl bg-stone-100 p-3 text-sm leading-5 text-stone-600 dark:bg-white/5 dark:text-stone-300">
          Reminders are off. You can opt in to quiet in-app reminders in
          Settings.
        </p>
      )}
      {overview?.notifications_enabled &&
        overview.routines.some((routine) => routine.reminder_active) && (
          <p
            aria-live="polite"
            className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            Reminder due:{" "}
            {overview.routines
              .filter((routine) => routine.reminder_active)
              .map((routine) => routine.title)
              .join(", ")}
          </p>
        )}
      {error && (
        <p
          className="mt-4 text-sm text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {overview?.routines.length ? (
        <ul className="mt-5 divide-y divide-stone-200 dark:divide-white/10">
          {overview.routines.map((routine) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              key={routine.id}
            >
              <div>
                <p className="font-medium">{routine.title}</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {routine.is_scheduled_today
                    ? routine.status === "completed"
                      ? "Done today"
                      : routine.status === "snoozed"
                        ? "Snoozed for today"
                        : "Due today"
                    : "Not scheduled today"}
                  {routine.reminder_active ? " · reminder active" : ""}
                </p>
              </div>
              {routine.is_scheduled_today && routine.status !== "completed" && (
                <div className="flex gap-2">
                  {routine.status !== "snoozed" && (
                    <button
                      className={smallButtonClass}
                      disabled={busy}
                      onClick={() => void updateRoutine("snooze", routine.id)}
                      type="button"
                    >
                      Snooze 1h
                    </button>
                  )}
                  <button
                    className={smallButtonClass}
                    disabled={busy}
                    onClick={() => void updateRoutine("complete", routine.id)}
                    type="button"
                  >
                    Complete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-6 text-stone-500 dark:text-stone-400">
          No routines due today. Add one below; past days won’t become a
          backlog.
        </p>
      )}

      {overview?.recent_completions.length ? (
        <section
          aria-labelledby="routine-history-title"
          className="mt-5 border-t border-stone-200 pt-5 dark:border-white/10"
        >
          <h3 className="text-sm font-semibold" id="routine-history-title">
            Recent completion history
          </h3>
          <ul className="mt-2 grid gap-2 text-sm text-stone-500 dark:text-stone-400 sm:grid-cols-2">
            {overview.recent_completions.slice(0, 6).map((completion) => (
              <li key={`${completion.routine_id}-${completion.completed_at}`}>
                {completion.title ?? "Routine"} ·{" "}
                {formatCompletionDate(completion.completed_at)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form
        className="mt-6 grid gap-3 border-t border-stone-200 pt-5 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={submit}
      >
        <label className="text-sm font-medium sm:col-span-2 lg:col-span-2">
          New routine
          <input
            className={fieldClass}
            maxLength={120}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="e.g. Plan this week’s workouts"
            required
            value={title}
          />
        </label>
        <label className="text-sm font-medium">
          Area
          <select
            className={fieldClass}
            onChange={(event) =>
              setDomain(
                event.currentTarget.value as CreateRoutineInput["domain"],
              )
            }
            value={domain}
          >
            <option value="personal">Personal</option>
            <option value="finance">Finance</option>
            <option value="fitness">Fitness</option>
            <option value="nutrition">Nutrition</option>
            <option value="review">Review</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Schedule
          <select
            className={fieldClass}
            onChange={(event) =>
              setFrequency(
                event.currentTarget.value as CreateRoutineInput["frequency"],
              )
            }
            value={frequency}
          >
            <option value="daily">Every day</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        {frequency === "weekly" ? (
          <label className="text-sm font-medium">
            Day
            <select
              className={fieldClass}
              onChange={(event) => setDay(Number(event.currentTarget.value))}
              value={day}
            >
              {weekdays.map((weekday, index) => (
                <option key={weekday} value={index + 1}>
                  {weekday}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-sm font-medium">
            Reminder time
            <input
              className={fieldClass}
              onChange={(event) => setReminderTime(event.currentTarget.value)}
              type="time"
              value={reminderTime}
            />
          </label>
        )}
        {frequency === "weekly" && (
          <label className="text-sm font-medium">
            Reminder time
            <input
              className={fieldClass}
              onChange={(event) => setReminderTime(event.currentTarget.value)}
              type="time"
              value={reminderTime}
            />
          </label>
        )}
        <button
          className="self-end rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 disabled:cursor-wait disabled:opacity-60"
          disabled={busy || !title.trim()}
          type="submit"
        >
          Add routine
        </button>
      </form>
    </article>
  );
}

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-normal dark:border-white/15 dark:bg-stone-950";
const smallButtonClass =
  "rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/10";

function formatCompletionDate(value: string | null) {
  if (value === null) return "Completed recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
