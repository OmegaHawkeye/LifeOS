import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "@/api/client";
import { getOwnerSettings } from "@/modules/Foundation";
import { FitnessWorkoutTracker } from "./FitnessWorkoutTracker";
import { FitnessProgressPhotos } from "./FitnessProgressPhotos";
import { FitnessDashboardSummary } from "./FitnessDashboardSummary";

type Metric = {
  id: number;
  metric_type: string;
  value: string;
  unit: string;
  measured_at: string;
  notes?: string | null;
};
type Goal = {
  id: number;
  metric_type: string;
  target_value: string;
  unit: string;
  target_date?: string | null;
  notes?: string | null;
  status: string;
};

export function FitnessPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [metricType, setMetricType] = useState("weight");
  const [value, setValue] = useState("");
  const [metricNotes, setMetricNotes] = useState("");
  const [measuredAt, setMeasuredAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [goalValue, setGoalValue] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalNotes, setGoalNotes] = useState("");
  const [error, setError] = useState(false);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [measurementSystem, setMeasurementSystem] = useState<
    "metric" | "imperial"
  >("metric");
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editGoalValue, setEditGoalValue] = useState("");
  const [editGoalDate, setEditGoalDate] = useState("");
  const [editGoalNotes, setEditGoalNotes] = useState("");
  const [workoutTrackerKey, setWorkoutTrackerKey] = useState(0);
  const unit = metricUnit(metricType, measurementSystem);
  const weightMetrics = metrics.filter(
    (metric) => metric.metric_type === "weight",
  );
  const latestWeight = weightMetrics[0];
  const previousWeight = weightMetrics[1];
  const weightDelta =
    latestWeight && previousWeight
      ? Number(latestWeight.value) - Number(previousWeight.value)
      : null;

  const reload = useCallback(async () => {
    try {
      const [metricsResponse, goalsResponse] = await Promise.all([
        apiFetch(`/api/v1/fitness/body-metrics?days=${range}`),
        apiFetch("/api/v1/fitness/goals"),
      ]);
      if (!metricsResponse.ok || !goalsResponse.ok) throw new Error();
      setMetrics(((await metricsResponse.json()) as { data: Metric[] }).data);
      setGoals(((await goalsResponse.json()) as { data: Goal[] }).data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [range]);

  useEffect(() => {
    // The request synchronizes this screen with the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  useEffect(() => {
    getOwnerSettings()
      .then((settings) => setMeasurementSystem(settings.measurement_system))
      .catch(() => setError(true));
  }, []);

  async function addMetric(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiFetch("/api/v1/fitness/body-metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metric_type: metricType,
        value,
        unit,
        measured_at: `${measuredAt}T12:00:00Z`,
        notes: metricNotes || null,
      }),
    });
    if (!response.ok) {
      setError(true);
      return;
    }
    setValue("");
    setMetricNotes("");
    void reload();
  }

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiFetch("/api/v1/fitness/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metric_type: metricType,
        target_value: goalValue,
        unit,
        target_date: goalDate || null,
        notes: goalNotes || null,
      }),
    });
    if (!response.ok) {
      setError(true);
      return;
    }
    setGoalValue("");
    setGoalDate("");
    setGoalNotes("");
    void reload();
  }

  async function updateGoalStatus(
    goalId: number,
    status: "paused" | "completed",
  ) {
    const response = await apiFetch(`/api/v1/fitness/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError(true);
      return;
    }
    void reload();
  }

  function beginGoalEdit(goal: Goal) {
    setEditingGoalId(goal.id);
    setEditGoalValue(goal.target_value);
    setEditGoalDate(goal.target_date ?? "");
    setEditGoalNotes(goal.notes ?? "");
  }

  async function saveGoalEdit(
    event: FormEvent<HTMLFormElement>,
    goalId: number,
  ) {
    event.preventDefault();
    const response = await apiFetch(`/api/v1/fitness/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_value: editGoalValue,
        target_date: editGoalDate || null,
        notes: editGoalNotes || null,
      }),
    });
    if (!response.ok) {
      setError(true);
      return;
    }
    setEditingGoalId(null);
    void reload();
  }

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto w-full max-w-[1400px] pr-1 lg:pr-8 2xl:pr-14"
    >
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Progress you can feel
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        id="page-title"
      >
        Fitness
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
        Capture a measurement, then use the trend to decide what comes next.
      </p>
      <FitnessDashboardSummary
        onWorkoutStarted={() => setWorkoutTrackerKey((key) => key + 1)}
      />
      <FitnessWorkoutTracker
        key={workoutTrackerKey}
        measurementSystem={measurementSystem}
      />
      <FitnessProgressPhotos metrics={metrics} />
      {error && (
        <p
          className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
          role="alert"
        >
          Fitness data could not be loaded or saved.
        </p>
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <form
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900"
          onSubmit={addMetric}
        >
          <h2 className="text-lg font-semibold" id="body-metric-title">
            Add body metric
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Metric
              <select
                className={fieldClass}
                value={metricType}
                onChange={(event) => setMetricType(event.currentTarget.value)}
              >
                <option value="weight">Weight</option>
                <option value="body_fat">Body fat</option>
                <option value="waist">Waist</option>
                <option value="chest">Chest</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Value
              <input
                className={fieldClass}
                min="0"
                required
                step="0.01"
                type="number"
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
              />
            </label>
            <label className="text-sm font-medium">
              Unit
              <input className={fieldClass} readOnly value={unit} />
            </label>
            <label className="text-sm font-medium">
              Date
              <input
                className={fieldClass}
                required
                type="date"
                value={measuredAt}
                onChange={(event) => setMeasuredAt(event.currentTarget.value)}
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Progress note
              <textarea
                className={`${fieldClass} min-h-20 resize-y`}
                value={metricNotes}
                onChange={(event) => setMetricNotes(event.currentTarget.value)}
              />
            </label>
          </div>
          <button className={primaryButtonClass} type="submit">
            Save measurement
          </button>
        </form>
        <form
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900"
          onSubmit={addGoal}
        >
          <h2 className="text-lg font-semibold">Set a fitness goal</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Target value
              <input
                className={fieldClass}
                min="0"
                required
                step="0.01"
                type="number"
                value={goalValue}
                onChange={(event) => setGoalValue(event.currentTarget.value)}
              />
            </label>
            <label className="text-sm font-medium">
              Target date
              <input
                className={fieldClass}
                type="date"
                value={goalDate}
                onChange={(event) => setGoalDate(event.currentTarget.value)}
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Progress note
              <textarea
                className={`${fieldClass} min-h-20 resize-y`}
                value={goalNotes}
                onChange={(event) => setGoalNotes(event.currentTarget.value)}
              />
            </label>
          </div>
          <button className={primaryButtonClass} type="submit">
            Save goal
          </button>
        </form>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900">
          <h2 className="text-lg font-semibold">Recent measurements</h2>
          {metrics.length ? (
            <ul className="mt-4 space-y-3">
              {metrics.slice(0, 8).map((metric) => (
                <li
                  className="flex justify-between border-b border-stone-100 pb-3 text-sm dark:border-white/10"
                  key={metric.id}
                >
                  <span className="capitalize">
                    {metric.metric_type.replace("_", " ")}
                  </span>
                  <span className="font-semibold">
                    {metric.value} {metric.unit} ·{" "}
                    {new Date(metric.measured_at).toLocaleDateString()}
                  </span>
                  {metric.notes && (
                    <span className="basis-full text-stone-500 dark:text-stone-400">
                      {metric.notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              No measurements yet. Add your first one above.
            </p>
          )}
        </article>
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900">
          <h2 className="text-lg font-semibold">Active goals</h2>
          {goals.length ? (
            <ul className="mt-4 space-y-3">
              {goals
                .filter((goal) => goal.status === "active")
                .map((goal) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 text-sm dark:border-white/10"
                    key={goal.id}
                  >
                    <span className="capitalize">
                      {goal.metric_type.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {goal.target_value} {goal.unit}
                      </span>
                      <button
                        className="rounded-full border border-stone-200 px-2.5 py-1 text-xs transition hover:border-stone-400 dark:border-white/15 dark:hover:border-white/30"
                        onClick={() => beginGoalEdit(goal)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full border border-stone-200 px-2.5 py-1 text-xs transition hover:border-stone-400 dark:border-white/15 dark:hover:border-white/30"
                        onClick={() => void updateGoalStatus(goal.id, "paused")}
                        type="button"
                      >
                        Pause
                      </button>
                      <button
                        className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/80"
                        onClick={() =>
                          void updateGoalStatus(goal.id, "completed")
                        }
                        type="button"
                      >
                        Complete
                      </button>
                    </div>
                    {editingGoalId === goal.id && (
                      <form
                        className="basis-full rounded-2xl bg-stone-50 p-3 dark:bg-white/5"
                        onSubmit={(event) => void saveGoalEdit(event, goal.id)}
                      >
                        <div className="grid gap-3 sm:grid-cols-3">
                          <input
                            aria-label="Goal target value"
                            className={fieldClass}
                            min="0"
                            required
                            step="0.01"
                            type="number"
                            value={editGoalValue}
                            onChange={(event) =>
                              setEditGoalValue(event.currentTarget.value)
                            }
                          />
                          <input
                            aria-label="Goal target date"
                            className={fieldClass}
                            type="date"
                            value={editGoalDate}
                            onChange={(event) =>
                              setEditGoalDate(event.currentTarget.value)
                            }
                          />
                          <input
                            aria-label="Goal progress note"
                            className={fieldClass}
                            placeholder="Progress note"
                            value={editGoalNotes}
                            onChange={(event) =>
                              setEditGoalNotes(event.currentTarget.value)
                            }
                          />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className={primaryButtonClass} type="submit">
                            Save changes
                          </button>
                          <button
                            className="mt-5 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold dark:border-white/15"
                            onClick={() => setEditingGoalId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Set a goal to make progress visible.
            </p>
          )}
        </article>
      </div>
      <article className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Trend
            </p>
            <h2 className="mt-1 text-lg font-semibold">Weight direction</h2>
          </div>
          <div className="flex gap-2 text-xs">
            {([7, 30, 90] as const).map((days) => (
              <button
                className={`rounded-full px-3 py-1 transition ${range === days ? "bg-emerald-400 text-stone-950" : "bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"}`}
                key={days}
                onClick={() => setRange(days)}
                type="button"
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
        {latestWeight ? (
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold">
              {latestWeight.value} {latestWeight.unit}
            </span>
            {weightDelta !== null && (
              <span
                className={
                  weightDelta <= 0
                    ? "text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                    : "text-sm font-semibold text-orange-700 dark:text-orange-300"
                }
              >
                {weightDelta > 0 ? "+" : ""}
                {weightDelta.toFixed(1)} since previous measurement
              </span>
            )}
            {weightMetrics.length > 1 && (
              <svg
                aria-label="Weight trend"
                className="mt-4 h-20 w-full overflow-visible text-emerald-500"
                role="img"
                viewBox="0 0 300 80"
              >
                <polyline
                  fill="none"
                  points={trendPoints(weightMetrics)}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              </svg>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
            Add two weight measurements to see direction.
          </p>
        )}
      </article>
    </section>
  );
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-stone-950";
const primaryButtonClass =
  "mt-5 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 dark:bg-white dark:text-stone-900";

function metricUnit(
  metricType: string,
  measurementSystem: "metric" | "imperial",
): string {
  if (metricType === "body_fat") return "%";
  if (metricType === "weight")
    return measurementSystem === "metric" ? "kg" : "lb";
  return measurementSystem === "metric" ? "cm" : "in";
}

function trendPoints(metrics: Metric[]): string {
  const values = metrics
    .slice()
    .reverse()
    .map((metric) => Number(metric.value))
    .filter((value) => Number.isFinite(value));
  if (values.length < 2) return "";
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 300;
      const y = 70 - ((value - minimum) / spread) * 60;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
