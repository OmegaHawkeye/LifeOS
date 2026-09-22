import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SummaryCard } from "@lifeos/ui";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import {
  getFinanceBudgets,
  getFinanceOverview,
  getFinanceSavingsGoals,
  getFinanceSubscriptions,
} from "../Finance/finance";
import type {
  FinanceBudget,
  FinanceOverview,
  FinanceSavingsGoal,
  FinanceSubscription,
} from "../Finance/finance";
import { getNutritionDashboard } from "../Nutrition/nutrition";
import type { NutritionDashboard } from "../Nutrition/nutrition";
import { getFitnessDashboard } from "../Fitness/fitnessDashboard";
import type { FitnessDashboard } from "../Fitness/fitnessDashboard";
import {
  formatHealthTrendValue,
  getHealthTrendsSummary,
  healthTrendUnit,
} from "../Health/health";
import type { HealthTrendsSummary } from "../Health/health";
import { RoutinesPanel } from "../Routines/RoutinesPanel";

export function DashboardPage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [fitness, setFitness] = useState<FitnessSnapshot | null>(null);
  const [fitnessDashboard, setFitnessDashboard] =
    useState<FitnessDashboard | null>(null);
  const [planning, setPlanning] = useState<FinancePlanningSnapshot | null>(
    null,
  );
  const [nutrition, setNutrition] = useState<NutritionSnapshot | null>(null);
  const [health, setHealth] = useState<HealthTrendsSummary | null>(null);

  useEffect(() => {
    getFinanceOverview(currentMonth())
      .then(setOverview)
      .catch(() => undefined);
    loadFitnessSnapshot()
      .then(setFitness)
      .catch(() => undefined);
    getFitnessDashboard()
      .then(setFitnessDashboard)
      .catch(() => undefined);
    loadFinancePlanning(currentMonth())
      .then(setPlanning)
      .catch(() => undefined);
    getNutritionDashboard(currentWeekStart())
      .then(setNutrition)
      .catch(() => undefined);
    getHealthTrendsSummary("7d")
      .then(setHealth)
      .catch(() => undefined);
  }, []);

  const total = overview?.totals[0];

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto w-full max-w-[1400px] pr-1 lg:pr-8 2xl:pr-14"
    >
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Your day, in context
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            id="page-title"
          >
            Dashboard
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
            A calm starting point for the decisions and actions that matter
            today.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold transition hover:bg-stone-200 dark:border-white/15 dark:hover:bg-white/10"
            to="/wall"
          >
            Open wall mode
          </Link>
          <Link
            className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300"
            to="/finance"
          >
            Add a transaction
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Today’s focus
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Choose one useful next step.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500 dark:text-stone-400">
            Your priorities, reminders, and planned activities will appear here
            as you capture them.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={actionClass} to="/fitness#body-metric-title">
              Log a body metric
            </Link>
            <Link className={actionClass} to="/fitness#workout-title">
              Start a workout
            </Link>
            <Link className={actionClass} to="/nutrition#meal-plan-title">
              Plan a meal
            </Link>
            <Link className={actionClass} to="/settings">
              Review settings
            </Link>
          </div>
        </article>
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Finance pulse
          </p>
          {total ? (
            <>
              <p className="mt-3 text-3xl font-semibold">
                {formatMoney(total.net_cashflow, total.currency)}
              </p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Net cashflow this month
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Record your first transaction to see this month’s cashflow.
            </p>
          )}
          <Link
            className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
            to="/finance"
          >
            Open Finance
          </Link>
        </article>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <FitnessStatusCard fitness={fitness} />
        <div className="flex min-w-0 flex-col gap-3">
          <SummaryCard
            title="Next workout"
            detail={
              fitnessDashboard?.next_workout?.name ??
              "Create a workout plan to get a next-session suggestion."
            }
          />
          <Link
            className="text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
            to="/fitness#workout-title"
          >
            Open Fitness
          </Link>
        </div>
        <NutritionStatusCard nutrition={nutrition} />
        <HealthStatusCard health={health} />
      </div>
      <RoutinesPanel />
      <FinancePlanningSummary planning={planning} />
    </section>
  );
}

type FitnessSnapshot = {
  latestWeight: FitnessMetric | null;
  previousWeight: FitnessMetric | null;
  activeGoal: FitnessGoal | null;
};

type FitnessMetric = {
  metric_type: string;
  value: string;
  unit: string;
};

type FitnessGoal = {
  metric_type: string;
  target_value: string;
  unit: string;
  status: string;
};

async function loadFitnessSnapshot(): Promise<FitnessSnapshot> {
  const [metricsResponse, goalsResponse] = await Promise.all([
    apiFetch("/api/v1/fitness/body-metrics?days=30"),
    apiFetch("/api/v1/fitness/goals"),
  ]);
  if (!metricsResponse.ok || !goalsResponse.ok) throw new Error();
  const metrics = ((await metricsResponse.json()) as { data: FitnessMetric[] })
    .data;
  const goals = ((await goalsResponse.json()) as { data: FitnessGoal[] }).data;
  const weights = metrics.filter((metric) => metric.metric_type === "weight");
  return {
    latestWeight: weights[0] ?? null,
    previousWeight: weights[1] ?? null,
    activeGoal: goals.find((goal) => goal.status === "active") ?? null,
  };
}

function FitnessStatusCard({ fitness }: { fitness: FitnessSnapshot | null }) {
  const delta =
    fitness?.latestWeight && fitness.previousWeight
      ? Number(fitness.latestWeight.value) -
        Number(fitness.previousWeight.value)
      : null;

  return (
    <article className="rounded-3xl border border-stone-200 bg-white/70 p-6 dark:border-white/15 dark:bg-stone-900/60">
      <h2 className="text-lg font-semibold">Fitness</h2>
      {fitness?.latestWeight ? (
        <>
          <p className="mt-2 text-2xl font-semibold">
            {fitness.latestWeight.value} {fitness.latestWeight.unit}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {delta === null
              ? "Latest recorded weight"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} since previous measurement`}
          </p>
          {fitness.activeGoal && (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Goal: {fitness.activeGoal.target_value} {fitness.activeGoal.unit}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
          Add a body metric or plan your next workout.
        </p>
      )}
      <Link
        className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
        to="/fitness"
      >
        Open Fitness
      </Link>
    </article>
  );
}

type FinancePlanningSnapshot = {
  budgets: FinanceBudget[];
  subscriptions: FinanceSubscription[];
  goals: FinanceSavingsGoal[];
};

async function loadFinancePlanning(
  month: string,
): Promise<FinancePlanningSnapshot> {
  const [budgets, subscriptions, goals] = await Promise.all([
    getFinanceBudgets(month),
    getFinanceSubscriptions(),
    getFinanceSavingsGoals(),
  ]);
  return { budgets, subscriptions, goals };
}

function FinancePlanningSummary({
  planning,
}: {
  planning: FinancePlanningSnapshot | null;
}) {
  const upcomingSubscriptions = planning?.subscriptions
    .filter((subscription) => subscription.status === "active")
    .sort((left, right) =>
      left.next_renewal_on.localeCompare(right.next_renewal_on),
    )
    .slice(0, 2);
  const activeGoals = planning?.goals.slice(0, 2);

  return (
    <article className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Plan ahead
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            Budgets, renewals & savings
          </h2>
        </div>
        <Link
          className="text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
          to="/finance"
        >
          Open Finance
        </Link>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <PlanningColumn title="Budgets">
          {planning?.budgets.length ? (
            planning.budgets.slice(0, 3).map((budget) => (
              <p key={budget.id}>
                {budget.category_name}:{" "}
                {formatMoney(Number(budget.spent), budget.currency)} /{" "}
                {formatMoney(Number(budget.target_amount), budget.currency)}
              </p>
            ))
          ) : (
            <p>No monthly budgets yet.</p>
          )}
        </PlanningColumn>
        <PlanningColumn title="Upcoming renewals">
          {upcomingSubscriptions?.length ? (
            upcomingSubscriptions.map((subscription) => (
              <p key={subscription.id}>
                {subscription.name}:{" "}
                {formatMoney(
                  Number(subscription.amount),
                  subscription.currency,
                )}{" "}
                · {formatDate(subscription.next_renewal_on)}
              </p>
            ))
          ) : (
            <p>No active subscriptions yet.</p>
          )}
        </PlanningColumn>
        <PlanningColumn title="Savings goals">
          {activeGoals?.length ? (
            activeGoals.map((goal) => (
              <p key={goal.id}>
                {goal.name}: {Math.round(goal.progress_percent)}% ·{" "}
                {formatDate(goal.target_date)}
              </p>
            ))
          ) : (
            <p>No savings goals yet.</p>
          )}
        </PlanningColumn>
      </div>
    </article>
  );
}

type NutritionSnapshot = NutritionDashboard;

function HealthStatusCard({ health }: { health: HealthTrendsSummary | null }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white/70 p-6 dark:border-white/15 dark:bg-stone-900/60">
      <h2 className="text-lg font-semibold">Health · last 7 days</h2>
      {health?.trends.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {health.trends.map((trend) => (
            <li
              className="flex justify-between gap-3"
              key={`${trend.sample_type}-${trend.unit}`}
            >
              <span className="capitalize text-stone-500 dark:text-stone-400">
                {trend.sample_type.replaceAll("_", " ")}
              </span>
              <span className="font-medium">
                {formatHealthTrendValue(trend.total)}{" "}
                {healthTrendUnit(trend.sample_type, trend.unit)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
          Add a manual signal or connect a health source to start seeing trends.
        </p>
      )}
      <Link
        className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
        to="/health"
      >
        Open Health
      </Link>
    </article>
  );
}

function NutritionStatusCard({
  nutrition,
}: {
  nutrition: NutritionSnapshot | null;
}) {
  const targetSummary = [
    nutrition?.target.calories
      ? `${Math.round(Number(nutrition.target.calories))} kcal`
      : null,
    nutrition?.target.protein_grams
      ? `${Math.round(Number(nutrition.target.protein_grams))} g protein`
      : null,
  ].filter(Boolean);

  return (
    <article className="rounded-3xl border border-stone-200 bg-white/70 p-6 dark:border-white/15 dark:bg-stone-900/60">
      <h2 className="text-lg font-semibold">Nutrition</h2>
      {targetSummary.length ? (
        <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
          Target: {targetSummary.join(" · ")}
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
          Set a daily nutrition target to start planning.
        </p>
      )}
      {nutrition ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Today: {displayNutrient(nutrition.today.eaten.calories)} kcal ·{" "}
          {displayNutrient(nutrition.today.eaten.protein_grams)} g protein
          logged · {nutrition.today.planned_meal_count} meals planned
        </p>
      ) : null}
      <Link
        className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
        to="/nutrition"
      >
        Open Nutrition
      </Link>
    </article>
  );
}

function displayNutrient(value: string | null) {
  return value === null ? "—" : String(Math.round(Number(value)));
}

function PlanningColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
        {children}
      </div>
    </div>
  );
}

const actionClass =
  "rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold transition hover:bg-stone-100 dark:border-white/10 dark:hover:bg-white/10";
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
function currentWeekStart() {
  const now = new Date();
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function formatMoney(amount: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
