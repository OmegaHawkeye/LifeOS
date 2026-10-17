import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppIcon } from "@lifeos/ui/icons";
import type { LifeOSIconName } from "@lifeos/ui/icons";
import { Meter } from "@lifeos/ui/meter";
import type { MeterTone } from "@lifeos/ui/meter";
import { SignalCard } from "@lifeos/ui/signal-card";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  return (
    <section
      aria-labelledby="page-title"
      className="flex flex-col gap-6 tablet:gap-8"
    >
      <PageHead />

      <div className="flex flex-col gap-6 tablet:gap-8 desktop:grid desktop:grid-cols-[minmax(0,1fr)_300px] desktop:items-start desktop:gap-x-8">
        <aside
          aria-label="Quick add"
          className="flex flex-col gap-6 desktop:sticky desktop:top-10 desktop:col-start-2 desktop:row-span-3 desktop:row-start-1"
        >
          <DashboardSection title="Quick add">
            <QuickAdd />
          </DashboardSection>
          <Link
            className="inline-flex min-h-target-min items-center gap-2 self-start rounded-sm px-1 text-label text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            to="/wall"
          >
            <AppIcon name="today" size={18} />
            Open wall mode
          </Link>
        </aside>

        <DashboardSection className="desktop:col-start-1" title="Signals">
          <div className="grid gap-4 tablet:grid-cols-2 tablet:gap-6 wide:grid-cols-3">
            <FinanceSignal
              onOpen={() => navigate("/finance")}
              overview={overview}
            />
            <NextWorkoutSignal
              dashboard={fitnessDashboard}
              onOpen={() => navigate("/fitness#workout-title")}
            />
            <BodyWeightSignal
              fitness={fitness}
              onLog={() => navigate("/fitness#body-metric-title")}
            />
            <NutritionSignal
              nutrition={nutrition}
              onOpen={() => navigate("/nutrition")}
            />
            <HealthSignal health={health} onOpen={() => navigate("/health")} />
          </div>
        </DashboardSection>

        <div className="desktop:col-start-1">
          <RoutinesPanel />
        </div>

        <DashboardSection className="desktop:col-start-1" title="Plan ahead">
          <FinancePlanningSummary planning={planning} />
        </DashboardSection>
      </div>
    </section>
  );
}

function PageHead() {
  const today = new Date();

  return (
    <header className="flex flex-col gap-1">
      <p className="m-0 flex items-center gap-2 text-body-s text-ink-muted">
        <span aria-hidden="true" className="size-2 rounded-full bg-marigold" />
        {formatLongDate(today)} · Week {isoWeek(today)}
      </p>
      <h1
        className="m-0 text-balance font-display text-display-m text-ink tablet:text-display-l"
        id="page-title"
      >
        Today
      </h1>
    </header>
  );
}

function DashboardSection({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <h2 className="m-0 text-overline uppercase text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

const quickActions: {
  label: string;
  to: string;
  icon: LifeOSIconName;
  tile: string;
}[] = [
  {
    label: "Add a transaction",
    to: "/finance",
    icon: "finance",
    tile: "bg-finance-soft text-finance",
  },
  {
    label: "Log a body metric",
    to: "/fitness#body-metric-title",
    icon: "scale",
    tile: "bg-health-soft text-health",
  },
  {
    label: "Start a workout",
    to: "/fitness#workout-title",
    icon: "fitness",
    tile: "bg-fitness-soft text-fitness",
  },
  {
    label: "Plan a meal",
    to: "/nutrition#meal-plan-title",
    icon: "nutrition",
    tile: "bg-nutrition-soft text-nutrition",
  },
];

function QuickAdd() {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 @lg:grid-cols-4 desktop:grid-cols-1!">
      {quickActions.map((action) => (
        <li key={action.label}>
          <Link
            className="flex min-h-target-touch items-center gap-3 rounded-sm border border-line bg-surface px-3 py-2 text-label text-ink no-underline transition-colors duration-150 hover:border-line-strong hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            to={action.to}
          >
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-sm ${action.tile}`}
            >
              <AppIcon name={action.icon} size={18} />
            </span>
            {action.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FinanceSignal({
  onOpen,
  overview,
}: {
  onOpen: () => void;
  overview: FinanceOverview | null;
}) {
  const total = overview?.totals[0];

  return (
    <SignalCard
      action="Open finance"
      detail={
        total
          ? "Net cashflow this month"
          : "Record your first transaction to see this month’s cashflow."
      }
      enterDelayMs={0}
      eyebrow={formatMonth(new Date())}
      module="finance"
      onAction={onOpen}
      title="Cash flow"
      trend={total ? (Number(total.net_cashflow) >= 0 ? "up" : "down") : "flat"}
      value={
        total ? formatMoney(total.net_cashflow, total.currency) : undefined
      }
    />
  );
}

function NextWorkoutSignal({
  dashboard,
  onOpen,
}: {
  dashboard: FitnessDashboard | null;
  onOpen: () => void;
}) {
  const workout = dashboard?.next_workout;
  const week = dashboard?.weekly_workouts;

  return (
    <SignalCard
      action={workout ? "Start" : "Plan workouts"}
      detail={
        workout
          ? workout.scheduled_for
            ? `Scheduled for ${formatDate(workout.scheduled_for)}`
            : undefined
          : "Create a workout plan to get a next-session suggestion."
      }
      enterDelayMs={60}
      module="fitness"
      next={
        week && week.planned > 0
          ? `${week.completed} of ${week.planned} sessions this week`
          : undefined
      }
      onAction={onOpen}
      title="Next workout"
      value={workout?.name}
    />
  );
}

function BodyWeightSignal({
  fitness,
  onLog,
}: {
  fitness: FitnessSnapshot | null;
  onLog: () => void;
}) {
  const latest = fitness?.latestWeight;
  const delta =
    latest && fitness?.previousWeight
      ? Number(latest.value) - Number(fitness.previousWeight.value)
      : null;

  return (
    <SignalCard
      action="Log weight"
      detail={
        latest
          ? fitness?.activeGoal
            ? `Goal: ${fitness.activeGoal.target_value} ${fitness.activeGoal.unit}`
            : "Latest recorded weight"
          : "Add a body metric or plan your next workout."
      }
      enterDelayMs={120}
      icon="scale"
      module="health"
      onAction={onLog}
      title="Body weight"
      trendText={
        delta === null
          ? undefined
          : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(1)} since previous`
      }
      unit={latest?.unit}
      value={latest?.value}
    />
  );
}

function NutritionSignal({
  nutrition,
  onOpen,
}: {
  nutrition: NutritionSnapshot | null;
  onOpen: () => void;
}) {
  const calorieTarget = numberOrNull(nutrition?.target.calories);
  const proteinTarget = numberOrNull(nutrition?.target.protein_grams);
  const eaten = nutrition?.today.eaten;

  return (
    <SignalCard
      action="Open plan"
      detail={
        calorieTarget === null && proteinTarget === null
          ? "Set a daily nutrition target to start planning."
          : undefined
      }
      enterDelayMs={180}
      eyebrow={
        calorieTarget === null
          ? undefined
          : `${Math.round(calorieTarget)} kcal target`
      }
      module="nutrition"
      next={
        nutrition
          ? `${nutrition.today.planned_meal_count} meals planned today`
          : undefined
      }
      onAction={onOpen}
      title="Meals today"
    >
      {calorieTarget === null ? null : (
        <Meter
          label="Energy"
          max={calorieTarget * 1.25}
          ofText={`of ${Math.round(calorieTarget)} kcal`}
          target={calorieTarget}
          tone="nutrition"
          value={numberOrNull(eaten?.calories) ?? 0}
          valueText={`${displayNutrient(eaten?.calories ?? null)} kcal`}
        />
      )}
      {proteinTarget === null ? null : (
        <Meter
          label="Protein"
          max={proteinTarget * 1.25}
          ofText={`of ${Math.round(proteinTarget)} g`}
          target={proteinTarget}
          tone="nutrition"
          value={numberOrNull(eaten?.protein_grams) ?? 0}
          valueText={`${displayNutrient(eaten?.protein_grams ?? null)} g`}
        />
      )}
    </SignalCard>
  );
}

function HealthSignal({
  health,
  onOpen,
}: {
  health: HealthTrendsSummary | null;
  onOpen: () => void;
}) {
  return (
    <SignalCard
      action="Open health"
      detail={
        health?.trends.length
          ? undefined
          : "Add a manual signal or connect a health source to start seeing trends."
      }
      enterDelayMs={240}
      module="health"
      onAction={onOpen}
      title="Health · last 7 days"
    >
      {health?.trends.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {health.trends.map((trend) => (
            <li
              className="flex items-baseline justify-between gap-3 border-line py-2 not-first:border-t"
              key={`${trend.sample_type}-${trend.unit}`}
            >
              <span className="text-body-s capitalize text-ink-muted">
                {trend.sample_type.replaceAll("_", " ")}
              </span>
              <span className="text-body-s font-semibold tabular-nums text-ink">
                {formatHealthTrendValue(trend.total)}{" "}
                {healthTrendUnit(trend.sample_type, trend.unit)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </SignalCard>
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
    .slice(0, 3);
  const activeGoals = planning?.goals.slice(0, 2);

  return (
    <article
      aria-labelledby="plan-ahead-title"
      className="@container flex flex-col gap-6 rounded-md border border-line bg-surface p-4 shadow-raised tablet:p-5 desktop:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-title-m text-ink" id="plan-ahead-title">
          Budgets, renewals & savings
        </h3>
        <Link
          className="inline-flex min-h-target-min items-center text-label text-primary-text underline-offset-4 hover:underline"
          to="/finance"
        >
          Open Finance
        </Link>
      </div>
      <div className="grid gap-6 @xl:grid-cols-3">
        <PlanningColumn title="Budgets">
          {planning?.budgets.length ? (
            planning.budgets
              .slice(0, 3)
              .map((budget) => <BudgetMeter budget={budget} key={budget.id} />)
          ) : (
            <EmptyLine>No monthly budgets yet.</EmptyLine>
          )}
        </PlanningColumn>
        <PlanningColumn title="Upcoming renewals">
          {upcomingSubscriptions?.length ? (
            <ul className="m-0 flex list-none flex-col p-0">
              {upcomingSubscriptions.map((subscription) => (
                <li
                  className="flex items-baseline justify-between gap-3 border-line py-2 first:pt-0 not-first:border-t"
                  key={subscription.id}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-s font-semibold text-ink">
                      {subscription.name}
                    </span>
                    <span className="text-caption text-ink-muted">
                      {formatDate(subscription.next_renewal_on)}
                    </span>
                  </span>
                  <span className="text-body-s font-semibold tabular-nums text-ink">
                    {formatMoney(
                      Number(subscription.amount),
                      subscription.currency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine>No active subscriptions yet.</EmptyLine>
          )}
        </PlanningColumn>
        <PlanningColumn title="Savings goals">
          {activeGoals?.length ? (
            activeGoals.map((goal) => (
              <Meter
                key={goal.id}
                label={goal.name}
                max={100}
                ofText={`by ${formatDate(goal.target_date)}`}
                tone="finance"
                value={Math.min(100, goal.progress_percent)}
                valueText={`${Math.round(goal.progress_percent)}%`}
              />
            ))
          ) : (
            <EmptyLine>No savings goals yet.</EmptyLine>
          )}
        </PlanningColumn>
      </div>
    </article>
  );
}

function BudgetMeter({ budget }: { budget: FinanceBudget }) {
  const spent = Number(budget.spent);
  const target = Number(budget.target_amount);
  const remaining = Number(budget.remaining);
  const tone: MeterTone = budget.is_over_budget
    ? "danger"
    : target > 0 && spent / target >= 0.9
      ? "warning"
      : "finance";

  return (
    <Meter
      label={budget.category_name}
      max={target > 0 ? Math.max(target, spent) : 1}
      note={
        budget.is_over_budget
          ? `${formatMoney(Math.abs(remaining), budget.currency)} over budget`
          : `${formatMoney(remaining, budget.currency)} left`
      }
      ofText={`of ${formatMoney(target, budget.currency)}`}
      target={target > 0 && spent > target ? target : undefined}
      tone={tone}
      value={spent}
      valueText={formatMoney(spent, budget.currency)}
    />
  );
}

type NutritionSnapshot = NutritionDashboard;

function PlanningColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h4 className="m-0 text-label text-ink">{title}</h4>
      {children}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="m-0 text-body-s text-ink-muted">{children}</p>;
}

function numberOrNull(value: string | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

function displayNutrient(value: string | null) {
  return value === null ? "—" : String(Math.round(Number(value)));
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
function currentWeekStart() {
  const now = new Date();
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function isoWeek(date: Date) {
  const day = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
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

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long" }).format(date);
}
