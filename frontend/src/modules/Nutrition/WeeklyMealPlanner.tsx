import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  copyNutritionWeek,
  createNutritionPlanItem,
  getNutritionPlanItems,
  updateNutritionPlanItem,
} from "./nutrition";
import type {
  NutritionPlanItem,
  NutritionRecipe,
  NutritionTarget,
} from "./nutrition";

const slots = ["breakfast", "lunch", "dinner", "snack"] as const;
const statuses = [
  "planned",
  "prepped",
  "eaten",
  "skipped",
  "replaced",
] as const;

type Props = { recipes: NutritionRecipe[]; target: NutritionTarget };

export function WeeklyMealPlanner({ recipes, target }: Props) {
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [items, setItems] = useState<NutritionPlanItem[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<
    Record<string, string>
  >({});
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  useEffect(() => {
    let active = true;
    getNutritionPlanItems(weekStart)
      .then((weekItems) => {
        if (active) {
          setItems(weekItems);
          setError(false);
          setLoadedWeek(weekStart);
        }
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setError(true);
          setLoadedWeek(weekStart);
        }
      });
    return () => {
      active = false;
    };
  }, [weekStart]);

  const itemsForWeek = useMemo(
    () => (loadedWeek === weekStart ? items : []),
    [items, loadedWeek, weekStart],
  );
  const weekTotals = useMemo(() => sumNutrition(itemsForWeek), [itemsForWeek]);

  async function addMeal(event: FormEvent<HTMLFormElement>, planDate: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const item = await createNutritionPlanItem({
        recipe_id: Number(form.get("recipe_id")),
        plan_date: planDate,
        meal_slot: String(form.get("meal_slot")) as (typeof slots)[number],
        servings: Number(form.get("servings")),
      });
      setItems((current) => [...current, item]);
      setSelectedRecipes((current) => ({ ...current, [planDate]: "" }));
      setError(false);
      setNotice("Meal added to the plan.");
    } catch {
      setError(true);
      setNotice("");
    }
  }

  async function changeStatus(id: number, status: (typeof statuses)[number]) {
    try {
      const updated = await updateNutritionPlanItem(id, { status });
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function copyPreviousWeek() {
    try {
      const copied = await copyNutritionWeek({
        source_week_start: addDays(weekStart, -7),
        target_week_start: weekStart,
      });
      setItems(copied);
      setError(false);
      setNotice("Previous week copied. All meals are marked as planned.");
    } catch {
      setError(true);
      setNotice("");
    }
  }

  return (
    <section
      aria-labelledby="meal-plan-title"
      className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Plan ahead
          </p>
          <h2 className="mt-1 text-2xl font-semibold" id="meal-plan-title">
            Weekly meal plan
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Build a week from your recipes, then track meal prep as you go.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label="Previous week"
            className={secondaryButtonClass}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            type="button"
          >
            ←
          </button>
          <p className="min-w-40 text-center text-sm font-semibold">
            {weekLabel(weekStart)}
          </p>
          <button
            aria-label="Next week"
            className={secondaryButtonClass}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            type="button"
          >
            →
          </button>
          <button
            className={secondaryButtonClass}
            disabled={
              itemsForWeek.length > 0 || loadedWeek !== weekStart || error
            }
            onClick={copyPreviousWeek}
            type="button"
          >
            Copy previous week
          </button>
        </div>
      </div>

      {error && (
        <p
          className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
          role="alert"
        >
          Meal plan could not be loaded or saved.
        </p>
      )}
      {notice && (
        <p
          className="mt-5 text-sm text-emerald-700 dark:text-emerald-300"
          role="status"
        >
          {notice}
        </p>
      )}

      <div
        aria-label="Weekly nutrition totals"
        role="region"
        className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4 dark:bg-white/5 sm:grid-cols-4"
      >
        <Total
          label="Week calories"
          value={weekTotals.calories}
          target={target.calories}
          unit="kcal"
        />
        <Total
          label="Week protein"
          value={weekTotals.protein_grams}
          target={target.protein_grams}
          unit="g"
        />
        <Total
          label="Week carbs"
          value={weekTotals.carbohydrate_grams}
          target={target.carbohydrate_grams}
          unit="g"
        />
        <Total
          label="Week fat"
          value={weekTotals.fat_grams}
          target={target.fat_grams}
          unit="g"
        />
      </div>

      {loadedWeek !== weekStart ? (
        <p className="mt-6 text-sm text-stone-500" role="status">
          Loading meal plan…
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dates.map((date) => {
            const dayItems = itemsForWeek.filter(
              (item) => item.plan_date === date,
            );
            const dayTotals = sumNutrition(dayItems);
            return (
              <article
                className="min-w-0 rounded-2xl border border-stone-200 p-4 dark:border-white/10"
                key={date}
              >
                <header>
                  <h3 className="font-semibold">{dayLabel(date)}</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
                    {display(dayTotals.calories)} /{" "}
                    {dailyTarget(target.calories)} kcal · P{" "}
                    {display(dayTotals.protein_grams)} /{" "}
                    {dailyTarget(target.protein_grams)} · C{" "}
                    {display(dayTotals.carbohydrate_grams)} /{" "}
                    {dailyTarget(target.carbohydrate_grams)} · F{" "}
                    {display(dayTotals.fat_grams)} /{" "}
                    {dailyTarget(target.fat_grams)} g
                  </p>
                </header>
                <ul className="mt-3 space-y-3">
                  {dayItems.map((item) => (
                    <li
                      className={`rounded-xl p-3 text-sm ${excluded(item.status) ? "bg-stone-50 opacity-60 dark:bg-white/5" : "bg-emerald-50/70 dark:bg-emerald-950/20"}`}
                      key={item.id}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{item.recipe_name}</span>
                        <span className="shrink-0 text-stone-500">
                          {item.servings}×
                        </span>
                      </div>
                      <p className="mt-1 text-xs capitalize text-stone-500">
                        {item.meal_slot} · {display(Number(item.calories) || 0)}{" "}
                        kcal
                      </p>
                      <label className="mt-2 block text-xs text-stone-600 dark:text-stone-300">
                        Meal status
                        <select
                          aria-label={`Status for ${item.recipe_name} on ${date}`}
                          className={fieldClass}
                          value={item.status}
                          onChange={(event) =>
                            void changeStatus(
                              item.id,
                              event.currentTarget
                                .value as (typeof statuses)[number],
                            )
                          }
                        >
                          {statuses.map((status) => (
                            <option
                              className="capitalize"
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
                </ul>
                {recipes.length ? (
                  <form
                    className="mt-4 space-y-2 border-t border-stone-100 pt-3 dark:border-white/10"
                    onSubmit={(event) => void addMeal(event, date)}
                  >
                    <label className="block text-xs font-medium">
                      Add a recipe
                      <select
                        aria-label={`Recipe for ${date}`}
                        className={fieldClass}
                        name="recipe_id"
                        onChange={(event) => {
                          const recipeId = event.currentTarget.value;
                          setSelectedRecipes((current) => ({
                            ...current,
                            [date]: recipeId,
                          }));
                        }}
                        required
                        value={selectedRecipes[date] ?? ""}
                      >
                        <option value="">Select recipe</option>
                        {recipes.map((recipe) => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <select
                        aria-label={`Meal slot for ${date}`}
                        className={fieldClass}
                        name="meal_slot"
                        defaultValue="breakfast"
                      >
                        {slots.map((slot) => (
                          <option
                            className="capitalize"
                            key={slot}
                            value={slot}
                          >
                            {slot}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`Servings for ${date}`}
                        className={fieldClass}
                        defaultValue="1"
                        min="0.01"
                        name="servings"
                        step="0.01"
                        type="number"
                      />
                    </div>
                    <button className={buttonClass} type="submit">
                      Add to day
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-white/10">
                    Create a recipe above to add meals here.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Total({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: string | null;
  unit: string;
}) {
  return (
    <div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">
        {display(value)} {unit}
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Target: {target ? `${display(Number(target) * 7)} ${unit}` : "not set"}
      </p>
    </div>
  );
}

function sumNutrition(items: NutritionPlanItem[]) {
  return items
    .filter((item) => !excluded(item.status))
    .reduce(
      (totals, item) => ({
        calories: totals.calories + (Number(item.calories) || 0),
        protein_grams: totals.protein_grams + (Number(item.protein_grams) || 0),
        carbohydrate_grams:
          totals.carbohydrate_grams + (Number(item.carbohydrate_grams) || 0),
        fat_grams: totals.fat_grams + (Number(item.fat_grams) || 0),
      }),
      { calories: 0, protein_grams: 0, carbohydrate_grams: 0, fat_grams: 0 },
    );
}

function excluded(status: string) {
  return status === "skipped" || status === "replaced";
}
function display(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    value,
  );
}
function dailyTarget(value: string | null) {
  return value ? display(Number(value)) : "—";
}
function currentWeekStart() {
  const date = new Date();
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return toDateString(date);
}
function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}
function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function weekLabel(date: string) {
  return (
    new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T12:00:00`)) +
    " – " +
    new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${addDays(date, 6)}T12:00:00`))
  );
}
function dayLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-stone-950";
const buttonClass =
  "w-full rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-stone-900";
const secondaryButtonClass =
  "rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5";
