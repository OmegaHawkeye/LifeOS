import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@lifeos/ui/button";
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
      className="mt-8 rounded-md border border-line bg-surface p-5 shadow-raised sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-overline uppercase text-ink-muted">
            Plan ahead
          </p>
          <h2 className="mt-1 text-figure-l font-semibold" id="meal-plan-title">
            Weekly meal plan
          </h2>
          <p className="mt-1 text-body-s text-ink-muted">
            Build a week from your recipes, then track meal prep as you go.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            accessibilityLabel="Previous week"
            onPress={() => setWeekStart(addDays(weekStart, -7))}
            variant="icon"
          >
            ←
          </Button>
          <p className="min-w-40 text-center text-body-s font-semibold">
            {weekLabel(weekStart)}
          </p>
          <Button
            accessibilityLabel="Next week"
            onPress={() => setWeekStart(addDays(weekStart, 7))}
            variant="icon"
          >
            →
          </Button>
          <Button
            disabled={
              itemsForWeek.length > 0 || loadedWeek !== weekStart || error
            }
            onPress={copyPreviousWeek}
            variant="secondary"
          >
            Copy previous week
          </Button>
        </div>
      </div>

      {error && (
        <p
          className="mt-5 rounded-sm bg-danger-soft p-3 text-body-s text-danger"
          role="alert"
        >
          Meal plan could not be loaded or saved.
        </p>
      )}
      {notice && (
        <p className="mt-5 text-body-s text-primary-text" role="status">
          {notice}
        </p>
      )}

      <div
        aria-label="Weekly nutrition totals"
        role="region"
        className="mt-5 grid grid-cols-2 gap-3 rounded-md bg-surface-sunken p-4 sm:grid-cols-4 [&>*]:min-w-0"
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
        <p className="mt-6 text-body-s text-ink-muted" role="status">
          Loading meal plan…
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
          {dates.map((date) => {
            const dayItems = itemsForWeek.filter(
              (item) => item.plan_date === date,
            );
            const dayTotals = sumNutrition(dayItems);
            return (
              <article
                className="min-w-0 rounded-md border border-line p-4"
                key={date}
              >
                <header>
                  <h3 className="font-semibold">{dayLabel(date)}</h3>
                  <p className="mt-1 text-caption leading-5 text-ink-muted">
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
                      className={`rounded-sm p-3 text-body-s ${excluded(item.status) ? "bg-surface-sunken opacity-60" : "bg-nutrition-soft"}`}
                      key={item.id}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{item.recipe_name}</span>
                        <span className="shrink-0 text-ink-muted">
                          {item.servings}×
                        </span>
                      </div>
                      <p className="mt-1 text-caption capitalize text-ink-muted">
                        {item.meal_slot} · {display(Number(item.calories) || 0)}{" "}
                        kcal
                      </p>
                      <label className="mt-2 block text-caption text-ink-muted">
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
                    className="mt-4 space-y-2 border-t border-line pt-3"
                    onSubmit={(event) => void addMeal(event, date)}
                  >
                    <label className="block text-caption font-medium">
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
                    <Button
                      className="w-full"
                      type="submit"
                      variant="secondary"
                    >
                      Add to day
                    </Button>
                  </form>
                ) : (
                  <p className="mt-4 border-t border-line pt-3 text-caption text-ink-muted">
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
      <p className="text-caption text-ink-muted">{label}</p>
      <p className="mt-1 text-body-s font-semibold">
        {display(value)} {unit}
      </p>
      <p className="text-caption text-ink-muted">
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
  "mt-1 w-full rounded-sm border border-line bg-surface px-2 py-2 text-body-s outline-none transition focus:border-focus focus:ring-4 focus:ring-focus";
