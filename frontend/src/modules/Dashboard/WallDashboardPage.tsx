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

  // The wall tokens switch on the root element; put the owner's theme back on exit.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    if (lightMode) {
      root.classList.remove("dark");
      delete root.dataset.theme;
    } else {
      root.dataset.theme = "wall";
    }
    return () => {
      delete root.dataset.theme;
      root.classList.toggle("dark", hadDark);
    };
  }, [lightMode]);

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
      className="min-h-svh bg-canvas px-6 py-7 text-ink tablet:px-10 tablet:py-9 desktop:px-12 desktop:py-12"
      aria-labelledby="wall-title"
    >
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 desktop:gap-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="m-0 flex items-center gap-3 text-body-l font-semibold text-ink-muted">
              <span
                aria-hidden="true"
                className="size-3 rounded-full bg-marigold"
              />
              LifeOS · Today
            </p>
            <h1
              id="wall-title"
              className="m-0 mt-2 font-display text-display-l tabular-nums text-ink desktop:text-display-xl"
            >
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: data?.timezone,
              })}
            </h1>
            <p className="m-0 mt-2 text-title-l font-normal text-ink-muted">
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
              className={wallControlClass}
              onClick={() => setShowSensitive((visible) => !visible)}
              type="button"
            >
              {showSensitive
                ? "Hide sensitive values"
                : "Reveal sensitive values"}
            </button>
            <button
              className={wallControlClass}
              onClick={() => setLightMode((light) => !light)}
              type="button"
            >
              {lightMode ? "Use ambient dark" : "Switch to light"}
            </button>
            <Link className={wallControlClass} to="/dashboard">
              Exit display mode
            </Link>
          </div>
        </header>

        {error && (
          <p
            className="m-0 rounded-lg bg-danger-soft p-5 text-body-l text-danger"
            role="alert"
          >
            Some LifeOS data could not be loaded. Check the connection and
            reload.
          </p>
        )}

        <section
          aria-label="Today's focus"
          className="grid gap-5 tablet:grid-cols-2 desktop:grid-cols-4 [&>*]:min-w-0"
        >
          <WallCard className="tablet:col-span-2" title="Today's focus">
            {nextWorkout ? (
              <>
                <WallFigure>
                  {showSensitive ? nextWorkout.name : "Workout planned"}
                </WallFigure>
                <WallNote>
                  {nextWorkout.scheduled_for
                    ? `Next workout · ${formatDate(nextWorkout.scheduled_for, data?.timezone)}`
                    : "Next workout from your plan"}
                </WallNote>
              </>
            ) : (
              <WallFigure>
                {dueCount
                  ? `${dueCount} routine${dueCount === 1 ? "" : "s"} ready when you are`
                  : "Choose one useful next step."}
              </WallFigure>
            )}
            <WallNote>
              {completedCount ?? 0} routines completed · {dueCount ?? 0} still
              open
            </WallNote>
          </WallCard>

          <WallCard module="finance" title="Finance pulse">
            {showSensitive && total ? (
              <WallFigure>
                {formatMoney(total.net_cashflow, total.currency)}
              </WallFigure>
            ) : (
              <p className="m-0 text-title-l font-normal text-ink">
                {total ? "Monthly cashflow hidden" : "No cashflow recorded"}
              </p>
            )}
            <WallNote>{data?.finance.month ?? "This month"}</WallNote>
          </WallCard>

          <WallCard module="routines" title="Routines & alerts">
            <WallFigure>
              {dueCount ?? "—"}
              <span className="text-title-l font-normal text-ink-muted">
                due
              </span>
            </WallFigure>
            <WallNote>
              {data?.routines.notifications_enabled
                ? "Quiet reminders are enabled"
                : "Reminders are off"}
            </WallNote>
          </WallCard>

          <WallCard module="fitness" title="Fitness">
            <WallFigure>
              {data?.fitness.weekly_workouts.completed ?? "—"}
              <span className="text-title-l font-normal text-ink-muted">
                workouts this week
              </span>
            </WallFigure>
            <WallNote>
              {nextWorkout
                ? showSensitive
                  ? nextWorkout.name
                  : "Next session planned"
                : "No next workout planned"}
            </WallNote>
          </WallCard>

          <WallCard module="nutrition" title="Nutrition">
            <WallFigure>
              {data?.nutrition.today.planned_meal_count ?? "—"}
              <span className="text-title-l font-normal text-ink-muted">
                meals planned today
              </span>
            </WallFigure>
            <WallNote>
              {data?.nutrition.today.eaten_meal_count ?? "—"} meals logged
            </WallNote>
          </WallCard>

          <WallCard title="Privacy">
            <p className="m-0 text-title-l font-normal text-ink">
              {showSensitive
                ? "Private values are visible"
                : "Sensitive values are hidden"}
            </p>
            <WallNote>
              {showSensitive
                ? "Personal workout names and finance amounts are visible."
                : "Names, amounts, and personal measurements stay off this display."}
            </WallNote>
          </WallCard>
        </section>
      </div>
    </main>
  );
}

const wallControlClass =
  "inline-flex min-h-target-wall items-center rounded-full border border-line-strong bg-surface px-6 text-body-l font-semibold text-ink no-underline transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-text motion-reduce:transition-none";

const wallModuleText = {
  finance: "text-finance",
  fitness: "text-fitness",
  nutrition: "text-nutrition",
  routines: "text-routines",
} as const;

function WallFigure({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-figure-xl tabular-nums text-ink">
      {children}
    </p>
  );
}

function WallNote({ children }: { children: ReactNode }) {
  return <p className="m-0 mt-2 text-body-l text-ink-muted">{children}</p>;
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
  module,
  className = "",
}: {
  title: string;
  children: ReactNode;
  module?: keyof typeof wallModuleText;
  className?: string;
}) {
  return (
    <article
      className={`flex min-h-56 animate-rise flex-col gap-2 rounded-lg border border-line bg-surface p-6 shadow-raised motion-reduce:animate-none tablet:p-8 desktop:p-10 ${className}`}
    >
      <h2
        className={`m-0 mb-3 text-overline uppercase ${module ? wallModuleText[module] : "text-ink-muted"}`}
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
