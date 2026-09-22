import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "@/api/client";

type Exercise = {
  id: number;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
};
type WorkoutSet = {
  id: number;
  set_number: number;
  reps: number | null;
  weight: string | null;
  weight_unit: "kg" | "lb" | null;
  rpe: string | null;
  duration_seconds: number | null;
};
type SessionExercise = {
  id: number;
  exercise_name: string;
  exercise: Exercise;
  target_sets: number | null;
  target_reps: string | null;
  target_weight: string | null;
  target_weight_unit: "kg" | "lb" | null;
  sets: WorkoutSet[];
};
type WorkoutTemplate = {
  id: number;
  name: string;
  scheduled_days: number[];
  exercises: Array<{
    exercise: Exercise;
    target_sets: number | null;
    target_reps: string | null;
    target_weight: string | null;
    target_weight_unit: "kg" | "lb" | null;
  }>;
};
type WorkoutSession = {
  id: number;
  template_id: number | null;
  name: string;
  status: "in_progress" | "completed";
  started_at: string;
  duration_minutes: number | null;
  exercises: SessionExercise[];
};
type RecentPerformance = {
  session: { id: number; name: string; completed_at: string } | null;
  sets: WorkoutSet[];
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function FitnessWorkoutTracker({
  measurementSystem = "metric",
}: {
  measurementSystem?: "metric" | "imperial";
}) {
  const weightUnit = measurementSystem === "metric" ? "kg" : "lb";
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [recentPerformance, setRecentPerformance] = useState<
    Record<number, RecentPerformance>
  >({});
  const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
  const [scheduledDays, setScheduledDays] = useState<number[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateNotes, setTemplateNotes] = useState("");
  const [adHocName, setAdHocName] = useState("Quick workout");
  const [adHocNotes, setAdHocNotes] = useState("");
  const [extraExerciseId, setExtraExerciseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const [exerciseResponse, templateResponse, sessionResponse] =
      await Promise.all([
        apiFetch("/api/v1/fitness/exercises"),
        apiFetch("/api/v1/fitness/workout-templates"),
        apiFetch("/api/v1/fitness/workout-sessions"),
      ]);
    if (!exerciseResponse.ok || !templateResponse.ok || !sessionResponse.ok) {
      throw new Error("Could not load workouts");
    }
    const [exercisePayload, templatePayload, sessionPayload] =
      await Promise.all([
        exerciseResponse.json() as Promise<{ data: Exercise[] }>,
        templateResponse.json() as Promise<{ data: WorkoutTemplate[] }>,
        sessionResponse.json() as Promise<{ data: WorkoutSession[] }>,
      ]);
    setExercises(exercisePayload.data);
    setTemplates(templatePayload.data);
    setSessions(sessionPayload.data);
    setError("");
  }, []);

  useEffect(() => {
    let active = true;
    // Load owner-scoped workout data when the Fitness workspace opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
      .catch(() => {
        if (active) setError("Workout data could not be loaded. Try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const activeSession = sessions.find(
    (session) => session.status === "in_progress",
  );

  useEffect(() => {
    if (!activeSession) return;
    let active = true;
    Promise.all(
      activeSession.exercises.map(async (item) => {
        const response = await apiFetch(
          `/api/v1/fitness/exercises/${item.exercise.id}/recent-performance`,
        );
        if (!response.ok) throw new Error("Could not load recent performance");
        const payload = (await response.json()) as {
          data: RecentPerformance;
        };
        return [item.exercise.id, payload.data] as const;
      }),
    )
      .then((entries) => {
        if (active) setRecentPerformance(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) setRecentPerformance({});
      });
    return () => {
      active = false;
    };
  }, [activeSession]);

  async function submit(action: () => Promise<void>) {
    setSaving(true);
    setError("");
    try {
      await action();
      await reload();
    } catch {
      setError("That workout change could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function createExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const response = await apiFetch("/api/v1/fitness/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newExerciseName }),
      });
      if (!response.ok) throw new Error();
      setNewExerciseName("");
    });
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const response = await apiFetch("/api/v1/fitness/workout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          notes: templateNotes || null,
          scheduled_days: scheduledDays,
          exercises: selectedExercises.map((exerciseId, position) => ({
            exercise_id: exerciseId,
            position,
            target_sets: 3,
            target_reps: "8-10",
          })),
        }),
      });
      if (!response.ok) throw new Error();
      setTemplateName("");
      setTemplateNotes("");
      setSelectedExercises([]);
      setScheduledDays([]);
    });
  }

  async function startTemplate(templateId: number) {
    await submit(async () => {
      const response = await apiFetch("/api/v1/fitness/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      if (!response.ok) throw new Error();
    });
  }

  async function startAdHoc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const response = await apiFetch("/api/v1/fitness/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: adHocName, notes: adHocNotes || null }),
      });
      if (!response.ok) throw new Error();
      setAdHocName("Quick workout");
      setAdHocNotes("");
    });
  }

  async function addExerciseToSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSession || !extraExerciseId) return;
    await submit(async () => {
      const response = await apiFetch(
        `/api/v1/fitness/workout-sessions/${activeSession.id}/exercises`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_id: Number(extraExerciseId) }),
        },
      );
      if (!response.ok) throw new Error();
      setExtraExerciseId("");
    });
  }

  async function logSet(
    event: FormEvent<HTMLFormElement>,
    sessionExercise: SessionExercise,
  ) {
    event.preventDefault();
    if (!activeSession) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body: Record<string, string> = {};
    form.forEach((value, key) => {
      if (typeof value === "string" && value !== "") body[key] = value;
    });
    if (!body.reps && !body.duration_seconds) {
      setError("Enter reps or a duration before adding a set.");
      return;
    }
    if (body.weight) body.weight_unit = weightUnit;
    await submit(async () => {
      const response = await apiFetch(
        `/api/v1/fitness/workout-sessions/${activeSession.id}/exercises/${sessionExercise.id}/sets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error();
      formElement.reset();
    });
  }

  async function completeWorkout() {
    if (!activeSession) return;
    await submit(async () => {
      const response = await apiFetch(
        `/api/v1/fitness/workout-sessions/${activeSession.id}/complete`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error();
    });
  }

  return (
    <section aria-labelledby="workout-title" className={panelClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Train at your pace
          </p>
          <h2 className="mt-1 text-2xl font-semibold" id="workout-title">
            Workouts
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Reusable plans, quick logging, and last-session context.
          </p>
        </div>
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-5 text-sm text-stone-500" role="status">
          Loading workouts…
        </p>
      ) : activeSession ? (
        <article className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Workout in progress
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                {activeSession.name}
              </h3>
            </div>
            <button
              className={secondaryButtonClass}
              disabled={
                saving ||
                activeSession.exercises.every((item) => item.sets.length === 0)
              }
              onClick={() => void completeWorkout()}
              type="button"
            >
              Finish workout
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {activeSession.exercises.map((item) => (
              <article
                className="rounded-2xl bg-white p-4 dark:bg-stone-900"
                key={item.id}
              >
                <h4 className="font-semibold">{item.exercise_name}</h4>
                {(item.target_sets ||
                  item.target_reps ||
                  item.target_weight) && (
                  <p className="mt-1 text-xs text-stone-500">
                    Target: {item.target_sets ? `${item.target_sets} sets` : ""}
                    {item.target_reps ? ` · ${item.target_reps} reps` : ""}
                    {item.target_weight
                      ? ` · ${item.target_weight} ${item.target_weight_unit ?? weightUnit}`
                      : ""}
                  </p>
                )}
                <RecentPerformance
                  performance={recentPerformance[item.exercise.id]}
                  weightUnit={weightUnit}
                />
                {item.sets.length > 0 && (
                  <ol className="mt-3 space-y-1 text-sm text-stone-600 dark:text-stone-300">
                    {item.sets.map((set) => (
                      <li key={set.id}>
                        Set {set.set_number}:{" "}
                        {set.reps ? `${set.reps} reps` : "timed"}
                        {set.weight
                          ? ` · ${set.weight} ${set.weight_unit ?? weightUnit}`
                          : ""}
                        {set.rpe ? ` · RPE ${set.rpe}` : ""}
                        {set.duration_seconds
                          ? ` · ${formatDuration(set.duration_seconds)}`
                          : ""}
                      </li>
                    ))}
                  </ol>
                )}
                <form
                  className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  onSubmit={(event) => void logSet(event, item)}
                >
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    Reps
                    <input
                      className={fieldClass}
                      min="1"
                      name="reps"
                      placeholder="8"
                      step="1"
                      type="number"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    Load ({weightUnit})
                    <input
                      className={fieldClass}
                      min="0"
                      name="weight"
                      placeholder="60"
                      step="0.25"
                      type="number"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    RPE
                    <input
                      className={fieldClass}
                      max="10"
                      min="1"
                      name="rpe"
                      placeholder="8"
                      step="0.5"
                      type="number"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    Time (sec)
                    <input
                      className={fieldClass}
                      min="1"
                      name="duration_seconds"
                      placeholder="Optional"
                      step="1"
                      type="number"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300 sm:col-span-2 lg:col-span-4">
                    Set note
                    <input
                      className={fieldClass}
                      name="notes"
                      placeholder="Optional"
                    />
                  </label>
                  <button
                    className={`${primaryButtonClass} sm:col-span-2 lg:col-span-4`}
                    disabled={saving}
                    type="submit"
                  >
                    Add set
                  </button>
                </form>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <form
              className="flex gap-2"
              onSubmit={(event) => void addExerciseToSession(event)}
            >
              <select
                aria-label="Add exercise to workout"
                className={fieldClass}
                onChange={(event) =>
                  setExtraExerciseId(event.currentTarget.value)
                }
                value={extraExerciseId}
              >
                <option value="">Add an exercise…</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <button
                className={secondaryButtonClass}
                disabled={saving || !extraExerciseId}
                type="submit"
              >
                Add
              </button>
            </form>
          </div>
        </article>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl bg-stone-50 p-4 dark:bg-white/5 sm:p-5">
            <h3 className="font-semibold">Start from a template</h3>
            {templates.length ? (
              <ul className="mt-3 space-y-3">
                {templates.map((template) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 dark:bg-stone-900"
                    key={template.id}
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {template.exercises
                          .map((item) => item.exercise.name)
                          .join(" · ")}
                        {template.scheduled_days.length > 0 &&
                          ` · ${template.scheduled_days
                            .map((day) => weekdays[day - 1])
                            .join(
                              ", ",
                            )}${template.scheduled_days.includes(new Date().getDay() || 7) ? " · Today" : ""}`}
                      </p>
                    </div>
                    <button
                      className={primaryButtonClass}
                      disabled={saving}
                      onClick={() => void startTemplate(template.id)}
                      type="button"
                    >
                      Start workout
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500">
                Create a reusable workout plan below.
              </p>
            )}
            <form
              className="mt-5 border-t border-stone-200 pt-4 dark:border-white/10"
              onSubmit={(event) => void startAdHoc(event)}
            >
              <label className="text-sm font-medium">
                Ad-hoc session
                <input
                  className={fieldClass}
                  maxLength={100}
                  required
                  value={adHocName}
                  onChange={(event) => setAdHocName(event.currentTarget.value)}
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Session note
                <input
                  className={fieldClass}
                  value={adHocNotes}
                  onChange={(event) => setAdHocNotes(event.currentTarget.value)}
                />
              </label>
              <button
                className={secondaryButtonClass}
                disabled={saving}
                type="submit"
              >
                Start without a template
              </button>
            </form>
          </article>

          <div className="space-y-4">
            <form
              className="rounded-2xl border border-stone-200 p-4 dark:border-white/10 sm:p-5"
              onSubmit={(event) => void createExercise(event)}
            >
              <h3 className="font-semibold">Exercise library</h3>
              <div className="mt-3 flex gap-2">
                <input
                  aria-label="New exercise name"
                  className={fieldClass}
                  maxLength={100}
                  required
                  value={newExerciseName}
                  onChange={(event) =>
                    setNewExerciseName(event.currentTarget.value)
                  }
                />
                <button
                  className={secondaryButtonClass}
                  disabled={saving}
                  type="submit"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {exercises.length} exercises available to your plans.
              </p>
            </form>

            <form
              className="rounded-2xl border border-stone-200 p-4 dark:border-white/10 sm:p-5"
              onSubmit={(event) => void createTemplate(event)}
            >
              <h3 className="font-semibold">Create reusable template</h3>
              <label className="mt-3 block text-sm font-medium">
                Template name
                <input
                  className={fieldClass}
                  maxLength={100}
                  required
                  value={templateName}
                  onChange={(event) =>
                    setTemplateName(event.currentTarget.value)
                  }
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Template note
                <input
                  className={fieldClass}
                  value={templateNotes}
                  onChange={(event) =>
                    setTemplateNotes(event.currentTarget.value)
                  }
                />
              </label>
              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-stone-500">
                  Repeat on (optional)
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weekdays.map((day, index) => {
                    const dayNumber = index + 1;
                    return (
                      <label
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm dark:border-white/10"
                        key={day}
                      >
                        <input
                          checked={scheduledDays.includes(dayNumber)}
                          onChange={() =>
                            setScheduledDays((current) =>
                              current.includes(dayNumber)
                                ? current.filter((value) => value !== dayNumber)
                                : [...current, dayNumber].sort(),
                            )
                          }
                          type="checkbox"
                        />
                        {day}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-stone-500">
                  Exercises · 3 sets of 8–10 reps by default
                </legend>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-stone-50 p-2 dark:bg-white/5">
                  {exercises.length ? (
                    exercises.map((exercise) => (
                      <label
                        className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm"
                        key={exercise.id}
                      >
                        <input
                          checked={selectedExercises.includes(exercise.id)}
                          onChange={() =>
                            setSelectedExercises((current) =>
                              current.includes(exercise.id)
                                ? current.filter((id) => id !== exercise.id)
                                : [...current, exercise.id],
                            )
                          }
                          type="checkbox"
                        />
                        {exercise.name}
                      </label>
                    ))
                  ) : (
                    <p className="p-2 text-sm text-stone-500">
                      Add an exercise first.
                    </p>
                  )}
                </div>
              </fieldset>
              <button
                className={`${primaryButtonClass} w-full`}
                disabled={saving || !selectedExercises.length}
                type="submit"
              >
                Save template
              </button>
            </form>
          </div>
        </div>
      )}

      {!activeSession &&
        sessions.some((session) => session.status === "completed") && (
          <article className="mt-5 rounded-2xl border border-stone-200 p-4 dark:border-white/10 sm:p-5">
            <h3 className="font-semibold">Recent workouts</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {sessions
                .filter((session) => session.status === "completed")
                .slice(0, 3)
                .map((session) => (
                  <li
                    className="flex flex-wrap justify-between gap-2 border-t border-stone-100 pt-2 dark:border-white/10"
                    key={session.id}
                  >
                    <span>
                      {session.name} ·{" "}
                      {session.exercises
                        .map((item) => item.exercise_name)
                        .join(", ")}
                    </span>
                    <span className="text-stone-500">
                      {session.duration_minutes ?? 0} min ·{" "}
                      {new Date(session.started_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
            </ul>
          </article>
        )}
    </section>
  );
}

function RecentPerformance({
  performance,
  weightUnit,
}: {
  performance?: RecentPerformance;
  weightUnit: "kg" | "lb";
}) {
  if (!performance?.session) {
    return (
      <p className="mt-1 text-xs text-stone-500">
        No previous completed sets yet.
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
      Last time (
      {new Date(performance.session.completed_at).toLocaleDateString()}):{" "}
      {performance.sets
        .map(
          (set) =>
            `${set.reps ?? formatDuration(set.duration_seconds ?? 0)}${set.reps ? ` × ${set.weight ?? "bodyweight"} ${set.weight_unit ?? weightUnit}` : ""}`,
        )
        .join(" · ")}
    </p>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes
    ? `${minutes}:${String(remainder).padStart(2, "0")}`
    : `${seconds}s`;
}

const panelClass =
  "mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-7";
const fieldClass =
  "mt-1 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-stone-950";
const primaryButtonClass =
  "mt-3 min-h-12 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-stone-900";
const secondaryButtonClass =
  "min-h-12 rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:border-white/40";
