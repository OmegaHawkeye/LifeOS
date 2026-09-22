import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getFinanceOverview } from "../Finance/finance";
import type { FinanceOverview } from "../Finance/finance";
import { getFitnessDashboard } from "../Fitness/fitnessDashboard";
import type { FitnessDashboard } from "../Fitness/fitnessDashboard";
import { getNutritionDashboard } from "../Nutrition/nutrition";
import type { NutritionDashboard } from "../Nutrition/nutrition";
import { getRoutineOverview } from "../Routines/routines";
import type { RoutineOverview } from "../Routines/routines";
import { getOwnerSettings } from "../Foundation/settings";

export function WallDashboardPage() {
  const [now, setNow] = useState(() => new Date());
  const [showSensitive, setShowSensitive] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [data, setData] = useState<WallDashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      getOwnerSettings(),
      getFinanceOverview(new Date().toISOString().slice(0, 7)),
      getFitnessDashboard(),
      getNutritionDashboard(currentWeekStart()),
      getRoutineOverview(),
    ])
      .then(([settings, finance, fitness, nutrition, routines]) => {
        if (!active) return;
        setData({
          timezone: settings.timezone,
          finance,
          fitness,
          nutrition,
          routines,
        });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const todayRoutines = data?.routines.routines.filter(
    (routine) => routine.is_scheduled_today,
  );
  const dueCount = todayRoutines?.filter(
    (routine) => routine.status === "due",
  ).length;
  const completedCount = todayRoutines?.filter(
    (routine) => routine.status === "completed",
  ).length;
  const nextWorkout = data?.fitness.next_workout;
  const total = data?.finance.totals[0];

  return (
    <main
      className={`min-h-svh px-6 py-7 sm:px-10 sm:py-9 lg:px-14 lg:py-12 ${lightMode ? "bg-stone-100 text-stone-950" : "bg-stone-950 text-stone-50"}`}
      aria-labelledby="wall-title"
    >
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-7 lg:gap-10">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p
              className={`text-lg font-medium ${lightMode ? "text-emerald-800" : "text-emerald-300"}`}
            >
              LifeOS · Today
            </p>
            <h1
              id="wall-title"
              className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl"
            >
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: data?.timezone,
              })}
            </h1>
            <p
              className={`mt-2 text-xl sm:text-2xl ${lightMode ? "text-stone-600" : "text-stone-400"}`}
            >
              {now.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: data?.timezone,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              aria-pressed={showSensitive}
              className={`rounded-full border px-5 py-3 text-base font-medium ${lightMode ? "border-stone-300 hover:bg-stone-200" : "border-white/15 hover:bg-white/10"}`}
              onClick={() => setShowSensitive((visible) => !visible)}
              type="button"
            >
              {showSensitive
                ? "Hide sensitive values"
                : "Reveal sensitive values"}
            </button>
            <button
              className={`rounded-full border px-5 py-3 text-base font-medium ${lightMode ? "border-stone-300 hover:bg-stone-200" : "border-white/15 hover:bg-white/10"}`}
              onClick={() => setLightMode((light) => !light)}
              type="button"
            >
              {lightMode ? "Use ambient dark" : "Switch to light"}
            </button>
            <Link
              className={`rounded-full px-5 py-3 text-base font-medium ${lightMode ? "bg-stone-200 hover:bg-stone-300" : "bg-white/10 hover:bg-white/15"}`}
              to="/dashboard"
            >
              Exit display mode
            </Link>
          </div>
        </header>

        {error && (
          <p
            className="rounded-2xl border border-rose-400/30 bg-rose-950/50 p-5 text-lg text-rose-100"
            role="alert"
          >
            Some LifeOS data could not be loaded. Check the connection and
            reload.
          </p>
        )}

        <section
          aria-label="Today's focus"
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <WallCard
            className="md:col-span-2 xl:col-span-2"
            lightMode={lightMode}
            title="Today's focus"
          >
            {nextWorkout ? (
              <>
                <p className="text-2xl font-semibold sm:text-3xl">
                  {showSensitive ? nextWorkout.name : "Workout planned"}
                </p>
                <p
                  className={`mt-2 text-lg ${lightMode ? "text-stone-600" : "text-stone-400"}`}
                >
                  {nextWorkout.scheduled_for
                    ? `Next workout · ${formatDate(nextWorkout.scheduled_for, data?.timezone)}`
                    : "Next workout from your plan"}
                </p>
              </>
            ) : (
              <p className="text-2xl font-semibold sm:text-3xl">
                {dueCount
                  ? `${dueCount} routine${dueCount === 1 ? "" : "s"} ready when you are`
                  : "Choose one useful next step."}
              </p>
            )}
            <p
              className={`mt-3 text-lg ${lightMode ? "text-stone-600" : "text-stone-400"}`}
            >
              {completedCount ?? 0} routines completed · {dueCount ?? 0} still
              open
            </p>
          </WallCard>

          <WallCard lightMode={lightMode} title="Finance pulse">
            {showSensitive && total ? (
              <p className="text-3xl font-semibold sm:text-4xl">
                {formatMoney(total.net_cashflow, total.currency)}
              </p>
            ) : (
              <p
                className={`text-xl font-medium ${lightMode ? "text-stone-700" : "text-stone-300"}`}
              >
                {total ? "Monthly cashflow hidden" : "No cashflow recorded"}
              </p>
            )}
            <p
              className={`mt-2 text-base ${lightMode ? "text-stone-600" : "text-stone-400"}`}
            >
              {data?.finance.month ?? "This month"}
            </p>
          </WallCard>

          <WallCard lightMode={lightMode} title="Routines & alerts">
            <p className="text-3xl font-semibold sm:text-4xl">
              {dueCount ?? "—"} <span className="text-xl font-medium">due</span>
            </p>
            <p
              className={`mt-2 text-base ${lightMode ? "text-stone-600" : "text-stone-400"}`}
            >
              {data?.routines.notifications_enabled
                ? "Quiet reminders are enabled"
                : "Reminders are off"}
            </p>
          </WallCard>

          <WallCard lightMode={lightMode} title="Fitness">
            <p className="text-3xl font-semibold sm:text-4xl">
              {data?.fitness.weekly_workouts.completed ?? "—"}
              <span className="text-xl font-medium"> workouts this week</span>
            </p>
            <p
              className={`mt-2 text-base ${lightMode ? "text-stone-600" : "text-stone-400"}`}
            >
              {nextWorkout
                ? showSensitive
                  ? nextWorkout.name
                  : "Next session planned"
                : "No next workout planned"}
            </p>
          </WallCard>

          <WallCard lightMode={lightMode} title="Nutrition">
            <p className="text-3xl font-semibold sm:text-4xl">
              {data?.nutrition.today.planned_meal_count ?? "—"}
              <span className="text-xl font-medium"> meals planned today</span>
            </p>
            <p className="mt-2 text-base text-stone-400">
              {data?.nutrition.today.eaten_meal_count ?? "—"} meals logged
            </p>
          </WallCard>

          <WallCard lightMode={lightMode} title="Privacy">
            <p className="text-xl font-medium">
              {showSensitive
                ? "Private values are visible"
                : "Sensitive values are hidden"}
            </p>
            <p
              className={`mt-2 text-base ${lightMode ? "text-stone-600" : "text-stone-400"}`}
            >
              {showSensitive
                ? "Personal workout names and finance amounts are visible."
                : "Names, amounts, and personal measurements stay off this display."}
            </p>
          </WallCard>
        </section>
      </div>
    </main>
  );
}

type WallDashboardData = {
  timezone: string;
  finance: FinanceOverview;
  fitness: FitnessDashboard;
  nutrition: NutritionDashboard;
  routines: RoutineOverview;
};

function WallCard({
  title,
  children,
  lightMode,
  className = "",
}: {
  title: string;
  children: ReactNode;
  lightMode: boolean;
  className?: string;
}) {
  return (
    <article
      className={`min-h-48 rounded-3xl border p-6 sm:min-h-56 sm:p-8 lg:p-10 ${lightMode ? "border-stone-300 bg-white" : "border-white/10 bg-white/[0.06]"} ${className}`}
    >
      <h2
        className={`mb-5 text-lg font-medium sm:text-xl ${lightMode ? "text-emerald-800" : "text-emerald-300"}`}
      >
        {title}
      </h2>
      {children}
    </article>
  );
}

function currentWeekStart() {
  const now = new Date();
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string, timezone?: string) {
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat([], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}
