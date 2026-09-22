// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NutritionPage } from "./NutritionPage";
import {
  copyNutritionWeek,
  createNutritionMeal,
  createNutritionRecipe,
  getNutritionDashboard,
  getNutritionMeals,
  getNutritionRecipes,
  getNutritionTarget,
} from "./nutrition";

vi.mock("./nutrition", () => ({
  copyNutritionWeek: vi.fn(),
  createNutritionMeal: vi.fn(),
  createNutritionRecipe: vi.fn(),
  getNutritionMeals: vi.fn(),
  getNutritionPlanItems: vi.fn().mockResolvedValue([]),
  getNutritionShoppingLists: vi.fn().mockResolvedValue([]),
  generateNutritionShoppingList: vi.fn(),
  addNutritionShoppingItem: vi.fn(),
  updateNutritionShoppingItem: vi.fn(),
  deleteNutritionShoppingItem: vi.fn(),
  getNutritionDashboard: vi.fn(),
  getNutritionRecipes: vi.fn(),
  getNutritionTarget: vi.fn(),
  updateNutritionTarget: vi.fn(),
}));

describe("Nutrition recipe and meal flows", () => {
  afterEach(cleanup);

  beforeEach(() => {
    const zeroes = {
      calories: "0.00",
      protein_grams: "0.00",
      carbohydrate_grams: "0.00",
      fat_grams: "0.00",
    };
    vi.mocked(getNutritionDashboard).mockResolvedValue({
      week_start: "2026-09-14",
      week_end: "2026-09-20",
      timezone: "Europe/Vienna",
      target: {
        calories: null,
        protein_grams: null,
        carbohydrate_grams: null,
        fat_grams: null,
      },
      today: {
        date: "2026-09-17",
        plan: [],
        eaten_meals: [],
        planned_meal_count: 0,
        eaten_meal_count: 0,
        planned: zeroes,
        eaten: zeroes,
      },
      week: {
        planned_meal_count: 0,
        eaten_meal_count: 0,
        status_counts: { skipped: 0, replaced: 0, marked_eaten: 0 },
        planned: zeroes,
        eaten: zeroes,
        daily: Array.from({ length: 7 }, (_, index) => ({
          date: `2026-09-${String(14 + index).padStart(2, "0")}`,
          planned_meal_count: 0,
          eaten_meal_count: 0,
          planned: zeroes,
          eaten: zeroes,
        })),
        prep_needed_count: 0,
        shopping_list_missing: false,
      },
      review: {
        reusable_meals: [],
        planning_gaps: [],
        next_week: {
          start_date: "2026-09-21",
          has_plan: false,
          can_copy: false,
        },
      },
    });
    vi.mocked(getNutritionTarget).mockResolvedValue({
      id: 1,
      calories: null,
      protein_grams: null,
      carbohydrate_grams: null,
      fat_grams: null,
      notes: null,
    });
    vi.mocked(getNutritionRecipes).mockResolvedValue([]);
    vi.mocked(getNutritionMeals).mockResolvedValue([]);
    vi.mocked(copyNutritionWeek).mockResolvedValue([]);
    vi.mocked(createNutritionRecipe).mockResolvedValue({
      id: 12,
      name: "Oat bowl",
      description: null,
      dietary_notes: null,
      servings: 1,
      instructions: "Mix",
      calories: "350.00",
      protein_grams: "20.00",
      carbohydrate_grams: null,
      fat_grams: null,
      micronutrients: null,
      tags: [],
      ingredients: [
        { id: 3, name: "Oats", quantity: "60.0000", unit: "g", position: 0 },
      ],
    });
    vi.mocked(createNutritionMeal).mockResolvedValue({
      id: 8,
      recipe_id: 12,
      name: "Oat bowl",
      meal_type: "breakfast",
      eaten_at: new Date().toISOString(),
      servings: "1.00",
      calories: "350.00",
      protein_grams: "20.00",
      carbohydrate_grams: null,
      fat_grams: null,
      notes: null,
    });
  });

  it("lets the owner save a recipe and log a serving from it", async () => {
    const user = userEvent.setup();
    render(<NutritionPage />);

    await screen.findByRole("heading", { name: "Recipe library" });
    await user.type(
      screen.getByRole("textbox", { name: "Recipe name" }),
      "Oat bowl",
    );
    await user.clear(screen.getByRole("spinbutton", { name: "Servings" }));
    await user.type(screen.getByRole("spinbutton", { name: "Servings" }), "1");
    await user.type(
      screen.getByRole("textbox", { name: "Ingredient 1" }),
      "Oats",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Quantity 1" }),
      "60",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Dietary notes" }),
      "Vegetarian",
    );
    await user.click(screen.getByRole("checkbox", { name: "high-protein" }));

    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(createNutritionRecipe).toHaveBeenCalled());
    expect(createNutritionRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Oat bowl",
        servings: 1,
        dietary_notes: "Vegetarian",
        tags: ["high-protein"],
        ingredients: [{ name: "Oats", quantity: 60, unit: "g" }],
      }),
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Recipe" }),
      "12",
    );
    const mealForm = screen
      .getByRole("heading", { name: "Log a meal" })
      .closest("form");
    expect(mealForm).not.toBeNull();
    await user.click(
      within(mealForm as HTMLFormElement).getByRole("button", {
        name: "Log meal",
      }),
    );
    await waitFor(() => expect(createNutritionMeal).toHaveBeenCalled());
    expect(createNutritionMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe_id: 12,
        meal_type: "breakfast",
        servings: 1,
      }),
    );
  });
});
