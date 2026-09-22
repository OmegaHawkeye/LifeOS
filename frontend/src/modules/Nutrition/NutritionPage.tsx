import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createNutritionMeal,
  createNutritionRecipe,
  getNutritionMeals,
  getNutritionRecipes,
  getNutritionTarget,
  updateNutritionTarget,
} from "./nutrition";
import type {
  NutritionMeal,
  NutritionRecipe,
  NutritionTarget,
} from "./nutrition";
import { WeeklyMealPlanner } from "./WeeklyMealPlanner";
import { NutritionShoppingLists } from "./NutritionShoppingLists";
import { NutritionDashboardSummary } from "./NutritionDashboardSummary";

type IngredientDraft = { name: string; quantity: string; unit: string };
const recipeTags = ["meal-prep", "high-protein", "quick", "budget", "favorite"];

export function NutritionPage() {
  const [target, setTarget] = useState<NutritionTarget | null>(null);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recipes, setRecipes] = useState<NutritionRecipe[]>([]);
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [ingredientLines, setIngredientLines] = useState<IngredientDraft[]>([
    { name: "", quantity: "", unit: "g" },
  ]);
  const [mealRecipeId, setMealRecipeId] = useState("");

  useEffect(() => {
    Promise.all([
      getNutritionTarget(),
      getNutritionRecipes(),
      getNutritionMeals(localDate()),
    ])
      .then(([nutritionTarget, nutritionRecipes, todaysMeals]) => {
        setTarget(nutritionTarget);
        setRecipes(nutritionRecipes);
        setMeals(todaysMeals);
      })
      .catch(() => setError(true));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    setSaved(false);
    setError(false);
    try {
      setTarget(
        await updateNutritionTarget({
          calories: numericTarget(target.calories),
          protein_grams: numericTarget(target.protein_grams),
          carbohydrate_grams: numericTarget(target.carbohydrate_grams),
          fat_grams: numericTarget(target.fat_grams),
          notes: target.notes || null,
        }),
      );
      setSaved(true);
    } catch {
      setError(true);
    }
  }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const recipe = await createNutritionRecipe({
        name: String(form.get("recipe_name")),
        servings: Number(form.get("recipe_servings")),
        instructions: String(form.get("instructions") || ""),
        dietary_notes: String(form.get("dietary_notes") || "") || null,
        calories: optionalNumber(form.get("recipe_calories")),
        protein_grams: optionalNumber(form.get("recipe_protein")),
        carbohydrate_grams: optionalNumber(form.get("recipe_carbs")),
        fat_grams: optionalNumber(form.get("recipe_fat")),
        tags: form.getAll("recipe_tags").map(String),
        ingredients: ingredientLines
          .filter((ingredient) => ingredient.name.trim())
          .map((ingredient) => ({
            name: ingredient.name.trim(),
            quantity: Number(ingredient.quantity),
            unit: ingredient.unit,
          })),
      });
      setRecipes((current) => [...current, recipe]);
      setIngredientLines([{ name: "", quantity: "", unit: "g" }]);
      formElement.reset();
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function logMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedRecipe = recipes.find(
      (recipe) => String(recipe.id) === mealRecipeId,
    );
    try {
      await createNutritionMeal({
        recipe_id: selectedRecipe?.id ?? null,
        name: selectedRecipe ? undefined : String(form.get("meal_name")),
        meal_type: String(form.get("meal_type")) as NutritionMeal["meal_type"],
        eaten_at: new Date(String(form.get("eaten_at"))).toISOString(),
        servings: Number(form.get("meal_servings") || 1),
        calories: selectedRecipe
          ? undefined
          : optionalNumber(form.get("meal_calories")),
        protein_grams: selectedRecipe
          ? undefined
          : optionalNumber(form.get("meal_protein")),
        carbohydrate_grams: selectedRecipe
          ? undefined
          : optionalNumber(form.get("meal_carbs")),
        fat_grams: selectedRecipe
          ? undefined
          : optionalNumber(form.get("meal_fat")),
        notes: String(form.get("meal_notes") || "") || null,
      });
      setMeals(await getNutritionMeals(localDate()));
      formElement.reset();
      setMealRecipeId("");
      setError(false);
    } catch {
      setError(true);
    }
  }

  if (!target) {
    return error ? (
      <p aria-live="assertive" role="alert">
        Nutrition data could not be loaded. Check the connection and reload.
      </p>
    ) : (
      <p aria-live="polite">Loading nutrition targets…</p>
    );
  }

  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-3xl">
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Eat with intention
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        id="page-title"
      >
        Nutrition
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">
        Set a daily target now; meals and recipes will build on this foundation.
      </p>
      {error && (
        <p
          className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          Nutrition data could not be saved or loaded.
        </p>
      )}
      {saved && (
        <p
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          Nutrition target saved.
        </p>
      )}
      <NutritionDashboardSummary />
      <WeeklyMealPlanner recipes={recipes} target={target} />
      <NutritionShoppingLists />
      <form
        className="mt-8 grid gap-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:grid-cols-2 sm:p-8"
        onSubmit={save}
      >
        <TargetField
          label="Calories"
          value={target.calories}
          onChange={(value) => setTarget({ ...target, calories: value })}
        />
        <TargetField
          label="Protein (g)"
          value={target.protein_grams}
          onChange={(value) => setTarget({ ...target, protein_grams: value })}
        />
        <TargetField
          label="Carbohydrates (g)"
          value={target.carbohydrate_grams}
          onChange={(value) =>
            setTarget({ ...target, carbohydrate_grams: value })
          }
        />
        <TargetField
          label="Fat (g)"
          value={target.fat_grams}
          onChange={(value) => setTarget({ ...target, fat_grams: value })}
        />
        <label className="text-sm font-medium sm:col-span-2">
          Notes
          <textarea
            className={fieldClass + " min-h-24 resize-y"}
            value={target.notes ?? ""}
            onChange={(event) =>
              setTarget({ ...target, notes: event.currentTarget.value })
            }
          />
        </label>
        <button className={buttonClass} type="submit">
          Save nutrition target
        </button>
      </form>
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <form
          className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8"
          onSubmit={saveRecipe}
        >
          <h2 className="text-xl font-semibold">Recipe library</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Save recipes with serving-level nutrition and reusable ingredients.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Recipe name"
              className={fieldClass}
              name="recipe_name"
              placeholder="Recipe name"
              required
            />
            <input
              aria-label="Servings"
              className={fieldClass}
              min="1"
              name="recipe_servings"
              placeholder="Servings"
              required
              type="number"
              defaultValue="1"
            />
            <input
              aria-label="Calories per serving"
              className={fieldClass}
              min="0"
              name="recipe_calories"
              placeholder="Calories per serving"
              type="number"
            />
            <input
              aria-label="Protein per serving (g)"
              className={fieldClass}
              min="0"
              name="recipe_protein"
              placeholder="Protein per serving (g)"
              type="number"
            />
            <input
              aria-label="Carbs per serving (g)"
              className={fieldClass}
              min="0"
              name="recipe_carbs"
              placeholder="Carbs per serving (g)"
              type="number"
            />
            <input
              aria-label="Fat per serving (g)"
              className={fieldClass}
              min="0"
              name="recipe_fat"
              placeholder="Fat per serving (g)"
              type="number"
            />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Ingredients (quantity + unit)</p>
            {ingredientLines.map((ingredient, index) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2"
                key={index}
              >
                <input
                  aria-label={`Ingredient ${index + 1}`}
                  className={fieldClass}
                  placeholder="Ingredient"
                  value={ingredient.name}
                  onChange={(event) =>
                    updateIngredientLine(
                      setIngredientLines,
                      index,
                      "name",
                      event.currentTarget.value,
                    )
                  }
                />
                <input
                  aria-label={`Quantity ${index + 1}`}
                  className={fieldClass}
                  min="0.001"
                  placeholder="Qty"
                  step="0.001"
                  type="number"
                  value={ingredient.quantity}
                  onChange={(event) =>
                    updateIngredientLine(
                      setIngredientLines,
                      index,
                      "quantity",
                      event.currentTarget.value,
                    )
                  }
                />
                <input
                  aria-label={`Unit ${index + 1}`}
                  className={fieldClass}
                  placeholder="Unit"
                  value={ingredient.unit}
                  onChange={(event) =>
                    updateIngredientLine(
                      setIngredientLines,
                      index,
                      "unit",
                      event.currentTarget.value,
                    )
                  }
                />
              </div>
            ))}
            <button
              className={secondaryButtonClass}
              onClick={() =>
                setIngredientLines((lines) => [
                  ...lines,
                  { name: "", quantity: "", unit: "g" },
                ])
              }
              type="button"
            >
              Add ingredient
            </button>
          </div>
          <textarea
            aria-label="Recipe instructions"
            className={fieldClass + " mt-3 min-h-20 resize-y"}
            name="instructions"
            placeholder="Instructions"
          />
          <textarea
            aria-label="Dietary notes"
            className={fieldClass + " mt-3 min-h-16 resize-y"}
            name="dietary_notes"
            placeholder="Dietary notes (allergens, preferences, etc.)"
          />
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Recipe tags</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {recipeTags.map((tag) => (
                <label className="flex items-center gap-2 text-sm" key={tag}>
                  <input name="recipe_tags" type="checkbox" value={tag} />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>
          <button className={buttonClass + " mt-4"} type="submit">
            Save recipe
          </button>
          <ul className="mt-5 space-y-2 text-sm text-stone-600 dark:text-stone-300">
            {recipes.map((recipe) => (
              <li
                className="rounded-xl bg-stone-50 p-3 dark:bg-white/5"
                key={recipe.id}
              >
                <span className="font-semibold">{recipe.name}</span> ·{" "}
                {recipe.servings} servings ·{" "}
                {recipe.ingredients
                  .map(
                    (ingredient) =>
                      `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`,
                  )
                  .join(", ")}
              </li>
            ))}
          </ul>
        </form>
        <div className="space-y-5">
          <form
            className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8"
            onSubmit={logMeal}
          >
            <h2 className="text-xl font-semibold">Log a meal</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <select
                aria-label="Recipe"
                className={fieldClass}
                value={mealRecipeId}
                onChange={(event) => setMealRecipeId(event.currentTarget.value)}
              >
                <option value="">Free-form meal</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Meal type"
                className={fieldClass}
                name="meal_type"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="other">Other</option>
              </select>
              {!mealRecipeId && (
                <input
                  aria-label="Meal name"
                  className={fieldClass}
                  name="meal_name"
                  placeholder="Meal name"
                  required
                />
              )}
              <input
                aria-label="Meal date and time"
                className={fieldClass}
                defaultValue={localDateTime()}
                name="eaten_at"
                required
                type="datetime-local"
              />
              <input
                aria-label="Meal servings"
                className={fieldClass}
                defaultValue="1"
                min="0.01"
                name="meal_servings"
                step="0.01"
                type="number"
              />
              {!mealRecipeId && (
                <input
                  aria-label="Meal calories"
                  className={fieldClass}
                  min="0"
                  name="meal_calories"
                  placeholder="Calories"
                  required
                  type="number"
                />
              )}
              {!mealRecipeId && (
                <input
                  aria-label="Meal protein (g)"
                  className={fieldClass}
                  min="0"
                  name="meal_protein"
                  placeholder="Protein (g)"
                  type="number"
                />
              )}
              {!mealRecipeId && (
                <input
                  aria-label="Meal carbs (g)"
                  className={fieldClass}
                  min="0"
                  name="meal_carbs"
                  placeholder="Carbs (g)"
                  type="number"
                />
              )}
              {!mealRecipeId && (
                <input
                  aria-label="Meal fat (g)"
                  className={fieldClass}
                  min="0"
                  name="meal_fat"
                  placeholder="Fat (g)"
                  type="number"
                />
              )}
            </div>
            <input
              aria-label="Meal notes"
              className={fieldClass + " mt-3"}
              name="meal_notes"
              placeholder="Notes (optional)"
            />
            <button className={buttonClass + " mt-4"} type="submit">
              Log meal
            </button>
          </form>
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8">
            <h2 className="text-xl font-semibold">Today</h2>
            {meals.length ? (
              <ul className="mt-4 space-y-3">
                {meals.map((meal) => (
                  <li
                    className="flex justify-between gap-3 border-b border-stone-100 pb-3 text-sm dark:border-white/10"
                    key={meal.id}
                  >
                    <span>
                      {meal.name}
                      <span className="ml-2 capitalize text-stone-500">
                        {meal.meal_type}
                      </span>
                    </span>
                    <span className="font-semibold">
                      {meal.calories ?? "—"} kcal
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                No meals logged today.
              </p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function TargetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className={fieldClass}
        min="0"
        step="0.01"
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-stone-950";
const buttonClass =
  "rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 dark:bg-white dark:text-stone-900";
const secondaryButtonClass =
  "rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold dark:border-white/15";

function optionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  return Number(value);
}

function updateIngredientLine(
  setLines: React.Dispatch<React.SetStateAction<IngredientDraft[]>>,
  index: number,
  key: keyof IngredientDraft,
  value: string,
) {
  setLines((lines) =>
    lines.map((line, lineIndex) =>
      lineIndex === index ? { ...line, [key]: value } : line,
    ),
  );
}

function localDateTime(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function numericTarget(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}
