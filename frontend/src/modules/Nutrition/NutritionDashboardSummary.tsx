import { useEffect, useState } from "react";
import { Button } from "@lifeos/ui/button";
import { copyNutritionWeek, getNutritionDashboard } from "./nutrition";
import type { NutritionDashboard } from "./nutrition";

const nutrients = [
  ["calories", "Calories", "kcal"],
  ["protein_grams", "Protein", "g"],
  ["carbohydrate_grams", "Carbohydrates", "g"],
  ["fat_grams", "Fat", "g"],
] as const;

export function NutritionDashboardSummary() {
  const [dashboard, setDashboard] = useState<NutritionDashboard | null>(null);
  const [error, setError] = useState(false);
  const [copying, setCopying] = useState(false);
  const [notice, setNotice] = useState("");
  const weekStart = currentWeekStart();

  async function refresh() {
    setDashboard(await getNutritionDashboard(weekStart));
  }

  useEffect(() => {
    let active = true;
    getNutritionDashboard(weekStart)
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [weekStart]);

  async function prepareNextWeek() {
    if (!dashboard?.review.next_week.can_copy) return;
    setCopying(true);
    setNotice("");
    try {
      await copyNutritionWeek({
        source_week_start: dashboard.week_start,
        target_week_start: dashboard.review.next_week.start_date,
      });
      await refresh();
      setNotice("Next week is ready from this week's reusable meal plan.");
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCopying(false);
    }
  }

  if (!dashboard) {
    return (
      <section aria-labelledby="nutrition-review-title" className={panelClass}>
        <h2 className="text-title-l font-semibold" id="nutrition-review-title">
          Nutrition dashboard
        </h2>
        <p
          className="mt-3 text-body-s text-ink-muted"
          role={error ? "alert" : "status"}
        >
          {error
            ? "Nutrition review could not be loaded. Please try again later."
            : "Loading your nutrition review…"}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="nutrition-review-title" className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-overline uppercase text-ink-muted">
            Check in, not judge
          </p>
          <h2
            className="mt-1 text-figure-l font-semibold"
            id="nutrition-review-title"
          >
            Nutrition dashboard
          </h2>
          <p className="mt-1 text-body-s text-ink-muted">
            Today and this week · {dashboard.week_start} – {dashboard.week_end}
          </p>
        </div>
        <a className={linkClass} href="#meal-plan-title">
          Open meal plan
        </a>
      </div>

      {error && (
        <p
          className="mt-4 rounded-sm bg-danger-soft p-3 text-body-s text-danger"
          role="alert"
        >
          The weekly review could not be refreshed. Try again.
        </p>
      )}
      {notice && (
        <p className="mt-4 text-body-s text-primary-text" role="status">
          {notice}{" "}
          <a className="underline" href="#meal-plan-title">
            Open the plan to fine-tune it.
          </a>
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] [&>*]:min-w-0">
        <article className="rounded-md bg-surface-sunken p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Today · {dashboard.today.date}</h3>
            <p className="text-caption text-ink-muted">
              {dashboard.today.planned_meal_count} planned ·{" "}
              {dashboard.today.eaten_meal_count} logged
            </p>
          </div>
          {dashboard.today.plan.length ? (
            <ul className="mt-3 space-y-2">
              {dashboard.today.plan.map((meal) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 text-body-s"
                  key={meal.id}
                >
                  <span>
                    <span className="font-medium">{meal.recipe_name}</span>
                    <span className="ml-2 text-ink-muted">
                      {meal.meal_slot}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-caption capitalize ${meal.status === "skipped" || meal.status === "replaced" ? "bg-surface-sunken text-ink-muted" : "bg-nutrition-soft text-nutrition"}`}
                  >
                    {meal.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-s text-ink-muted">
              Nothing planned for today yet.
            </p>
          )}
          <p className="mt-4 border-t border-line pt-3 text-caption text-ink-muted">
            Logged: {display(dashboard.today.eaten.calories)} kcal ·{" "}
            {display(dashboard.today.eaten.protein_grams)} g protein
          </p>
        </article>

        <article className="rounded-md border border-line p-4 sm:p-5">
          <h3 className="font-semibold">Weekly progress</h3>
          <p className="mt-1 text-caption text-ink-muted">
            Planned vs logged meals · {dashboard.week.planned_meal_count}{" "}
            planned · {dashboard.week.eaten_meal_count} logged
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 [&>*]:min-w-0">
            {nutrients.map(([key, label, unit]) => (
              <MetricSummary
                key={key}
                label={label}
                planned={dashboard.week.planned[key]}
                eaten={dashboard.week.eaten[key]}
                target={dashboard.target[key]}
                unit={unit}
              />
            ))}
          </div>
        </article>
      </div>

      <article className="mt-4 rounded-md border border-line p-4 sm:p-5">
        <h3 className="font-semibold">Daily rhythm</h3>
        <div className="mt-3 divide-y divide-line">
          {dashboard.week.daily.map((day) => (
            <div
              className="grid gap-1 py-2 text-caption sm:grid-cols-[7rem_1fr_1fr] sm:items-center [&>*]:min-w-0"
              key={day.date}
            >
              <span className="font-medium">{dayLabel(day.date)}</span>
              <span className="text-ink-muted">
                Plan {compactTotals(day.planned)}
              </span>
              <span className="text-ink-muted">
                Logged {compactTotals(day.eaten)}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="mt-4 grid gap-5 rounded-md bg-primary-soft p-4 sm:grid-cols-2 sm:p-5 [&>*]:min-w-0">
        <div>
          <h3 className="font-semibold">Weekly review</h3>
          <p className="mt-1 text-body-s text-ink-muted">
            {dashboard.review.reusable_meals.length
              ? `Reusable meals: ${dashboard.review.reusable_meals.map((meal) => `${meal.recipe_name} (${meal.planned_count}×)`).join(", ")}.`
              : "No repeated meals this week yet; your favorites can become next week's starting point."}
          </p>
          <p className="mt-2 text-body-s text-ink-muted">
            Planning gaps:{" "}
            {dashboard.review.planning_gaps.length
              ? dashboard.review.planning_gaps.map(dayLabel).join(", ")
              : "Every day has a planned meal."}
          </p>
          <p className="mt-2 text-caption text-ink-muted">
            {dashboard.week.status_counts.skipped +
              dashboard.week.status_counts.replaced >
            0
              ? `${dashboard.week.status_counts.skipped} skipped and ${dashboard.week.status_counts.replaced} replaced meals are included for context.`
              : "No skipped or replaced meals this week."}
          </p>
        </div>
        <div className="space-y-2 text-body-s">
          <p>
            Prep still to do:{" "}
            <span className="font-semibold">
              {dashboard.week.prep_needed_count}
            </span>{" "}
            meal-prep recipes
          </p>
          <p>
            Groceries:{" "}
            {dashboard.week.shopping_list_missing
              ? "shopping list not created yet"
              : "shopping list ready or no planned groceries needed"}
          </p>
          {dashboard.review.next_week.can_copy ? (
            <Button
              disabled={copying}
              loading={copying}
              onPress={() => void prepareNextWeek()}
            >
              {copying
                ? "Preparing next week…"
                : "Use this week to plan next week"}
            </Button>
          ) : dashboard.review.next_week.has_plan ? (
            <p className="text-caption text-ink-muted">
              Next week already has a plan. Add or adjust it in the meal
              planner.
            </p>
          ) : (
            <p className="text-caption text-ink-muted">
              Add meals to this week before creating a reusable next-week plan.
            </p>
          )}
        </div>
      </article>
    </section>
  );
}

function MetricSummary({
  label,
  planned,
  eaten,
  target,
  unit,
}: {
  label: string;
  planned: string | null;
  eaten: string | null;
  target: string | null;
  unit: string;
}) {
  const weeklyTarget = target === null ? null : Number(target) * 7;
  const progress =
    weeklyTarget && weeklyTarget > 0 && eaten !== null
      ? Math.min(100, (Number(eaten) / weeklyTarget) * 100)
      : null;

  return (
    <div>
      <p className="text-caption font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-body-s font-semibold">
        {display(eaten)} / {weeklyTarget === null ? "—" : display(weeklyTarget)}{" "}
        {unit}
      </p>
      <p className="text-[11px] text-ink-muted">
        Planned {display(planned)} {unit}
      </p>
      {weeklyTarget !== null && progress !== null && (
        <div
          aria-label={`${label} weekly target progress`}
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function currentWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateString(date);
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function display(value: string | number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Number(value),
  );
}

function compactTotals(totals: NutritionDashboard["week"]["planned"]) {
  return `${display(totals.calories)} kcal · P ${display(totals.protein_grams)} · C ${display(totals.carbohydrate_grams)} · F ${display(totals.fat_grams)} g`;
}

const panelClass =
  "mt-8 rounded-md border border-line bg-surface p-5 shadow-raised sm:p-7";
const linkClass =
  "text-body-s font-semibold text-primary-text underline underline-offset-4";
