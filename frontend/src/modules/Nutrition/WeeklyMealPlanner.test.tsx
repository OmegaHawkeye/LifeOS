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
import { WeeklyMealPlanner } from "./WeeklyMealPlanner";
import {
  copyNutritionWeek,
  createNutritionPlanItem,
  getNutritionPlanItems,
  updateNutritionPlanItem,
} from "./nutrition";
import type { NutritionPlanItem, NutritionRecipe } from "./nutrition";

vi.mock("./nutrition", () => ({
  copyNutritionWeek: vi.fn(),
  createNutritionPlanItem: vi.fn(),
  getNutritionPlanItems: vi.fn(),
  updateNutritionPlanItem: vi.fn(),
}));

const recipe: NutritionRecipe = {
  id: 12,
  name: "Oat bowl",
  description: null,
  dietary_notes: null,
  servings: 2,
  instructions: null,
  calories: "350.00",
  protein_grams: "20.00",
  carbohydrate_grams: "45.00",
  fat_grams: "10.00",
  micronutrients: null,
  tags: ["quick"],
  ingredients: [],
};

function planItem(
  status: NutritionPlanItem["status"] = "planned",
  planDate = "2026-09-14",
): NutritionPlanItem {
  return {
    id: 7,
    recipe_id: 12,
    recipe_name: "Oat bowl",
    plan_date: planDate,
    meal_slot: "breakfast",
    servings: "1.50",
    status,
    notes: null,
    calories: "525.00",
    protein_grams: "30.00",
    carbohydrate_grams: "67.50",
    fat_grams: "15.00",
  };
}

describe("WeeklyMealPlanner", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.mocked(getNutritionPlanItems).mockResolvedValue([]);
    vi.mocked(createNutritionPlanItem).mockResolvedValue(planItem());
    vi.mocked(updateNutritionPlanItem).mockResolvedValue(planItem("prepped"));
    vi.mocked(copyNutritionWeek).mockResolvedValue([planItem()]);
  });

  it("adds a recipe to a day, reflects totals, and updates meal-prep status", async () => {
    const weekStart = mondayThisWeek();
    vi.mocked(createNutritionPlanItem).mockResolvedValue(
      planItem("planned", weekStart),
    );
    vi.mocked(updateNutritionPlanItem).mockResolvedValue(
      planItem("prepped", weekStart),
    );
    const user = userEvent.setup();
    render(
      <WeeklyMealPlanner
        recipes={[recipe]}
        target={{
          id: 1,
          calories: "2200.00",
          protein_grams: "160.00",
          carbohydrate_grams: null,
          fat_grams: null,
          notes: null,
        }}
      />,
    );
    await screen.findByText("Weekly meal plan");
    const recipeSelect = await screen.findByRole("combobox", {
      name: `Recipe for ${weekStart}`,
    });
    await user.selectOptions(recipeSelect, "12");
    const dayCard = recipeSelect.closest("article");
    expect(dayCard).not.toBeNull();
    await user.click(
      within(dayCard as HTMLElement).getByRole("button", {
        name: "Add to day",
      }),
    );

    await waitFor(() =>
      expect(createNutritionPlanItem).toHaveBeenCalledWith({
        recipe_id: 12,
        plan_date: weekStart,
        meal_slot: "breakfast",
        servings: 1,
      }),
    );
    expect(await screen.findByText("525 kcal", { exact: true })).toBeVisible();
    const status = await screen.findByRole("combobox", {
      name: `Status for Oat bowl on ${weekStart}`,
    });
    await user.selectOptions(status, "prepped");
    await waitFor(() =>
      expect(updateNutritionPlanItem).toHaveBeenCalledWith(7, {
        status: "prepped",
      }),
    );
    vi.mocked(updateNutritionPlanItem).mockResolvedValue(
      planItem("skipped", weekStart),
    );
    await user.selectOptions(status, "skipped");
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Weekly nutrition totals" }),
      ).toHaveTextContent("0 kcal"),
    );
  });

  it("copies the previous week into an empty week", async () => {
    const weekStart = mondayThisWeek();
    const user = userEvent.setup();
    render(
      <WeeklyMealPlanner
        recipes={[recipe]}
        target={{
          id: 1,
          calories: null,
          protein_grams: null,
          carbohydrate_grams: null,
          fat_grams: null,
          notes: null,
        }}
      />,
    );
    await screen.findByText("Weekly meal plan");
    await user.click(screen.getByRole("button", { name: "Next week" }));
    await screen.findByRole("button", { name: "Copy previous week" });
    await user.click(
      screen.getByRole("button", { name: "Copy previous week" }),
    );
    await waitFor(() =>
      expect(copyNutritionWeek).toHaveBeenCalledWith({
        source_week_start: weekStart,
        target_week_start: addDays(weekStart, 7),
      }),
    );
  });
});

function mondayThisWeek() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateString(date);
}

function addDays(startDate: string, amount: number) {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
