// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NutritionDashboardSummary } from "./NutritionDashboardSummary";
import { copyNutritionWeek, getNutritionDashboard } from "./nutrition";
import type { NutritionDashboard } from "./nutrition";

vi.mock("./nutrition", () => ({
  copyNutritionWeek: vi.fn(),
  getNutritionDashboard: vi.fn(),
}));

describe("NutritionDashboardSummary", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getNutritionDashboard).mockResolvedValue(dashboard());
    vi.mocked(copyNutritionWeek).mockResolvedValue([]);
  });

  it("shows daily and weekly progress, calm status context, and weekly review", async () => {
    render(<NutritionDashboardSummary />);

    expect(
      await screen.findByText(`Today · ${dateString(new Date())}`),
    ).toBeVisible();
    expect(screen.getByText("1 planned · 1 logged")).toBeVisible();
    expect(
      screen.getByText(
        "1 skipped and 1 replaced meals are included for context.",
      ),
    ).toBeVisible();
    expect(screen.getByText(/Reusable meals: Oat bowl \(2×\)/)).toBeVisible();
    expect(screen.getByText(/Planning gaps:/)).toBeVisible();
    expect(screen.getByText(/meal-prep recipes/)).toBeVisible();
    expect(screen.getByText(/shopping list not created yet/)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Calories weekly target progress",
      }),
    ).toHaveAttribute("aria-valuenow", "3");
  });

  it("creates next-week planning items from the reusable current week", async () => {
    const user = userEvent.setup();
    const nextWeekDashboard = dashboard();
    nextWeekDashboard.review.next_week.has_plan = true;
    nextWeekDashboard.review.next_week.can_copy = false;
    vi.mocked(getNutritionDashboard)
      .mockResolvedValueOnce(dashboard())
      .mockResolvedValueOnce(nextWeekDashboard);
    render(<NutritionDashboardSummary />);

    await user.click(
      await screen.findByRole("button", {
        name: "Use this week to plan next week",
      }),
    );

    await waitFor(() =>
      expect(copyNutritionWeek).toHaveBeenCalledWith({
        source_week_start: currentWeekStart(),
        target_week_start: addDays(currentWeekStart(), 7),
      }),
    );
    expect(
      await screen.findByText(
        /Next week is ready from this week's reusable meal plan/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Next week already has a plan. Add or adjust it in the meal planner.",
      ),
    ).toBeVisible();
  });

  it("does not present incomplete nutrient data as zero progress", async () => {
    const incompleteDashboard = dashboard();
    incompleteDashboard.week.eaten.protein_grams = null;
    vi.mocked(getNutritionDashboard).mockResolvedValue(incompleteDashboard);
    render(<NutritionDashboardSummary />);

    expect(await screen.findByText(/— \/ 1,120 g/)).toBeVisible();
    expect(
      screen.queryByRole("progressbar", {
        name: "Protein weekly target progress",
      }),
    ).not.toBeInTheDocument();
  });
});

function dashboard(): NutritionDashboard {
  const weekStart = currentWeekStart();
  const today = dateString(new Date());
  const zeroes = {
    calories: "0.00",
    protein_grams: "0.00",
    carbohydrate_grams: "0.00",
    fat_grams: "0.00",
  };
  const progress: NutritionDashboard["week"]["planned"] = {
    calories: "500.00",
    protein_grams: "40.00",
    carbohydrate_grams: "60.00",
    fat_grams: "12.00",
  };

  return {
    week_start: weekStart,
    week_end: addDays(weekStart, 6),
    timezone: "Europe/Vienna",
    target: {
      calories: "2200.00",
      protein_grams: "160.00",
      carbohydrate_grams: null,
      fat_grams: null,
    },
    today: {
      date: today,
      plan: [
        {
          id: 1,
          recipe_name: "Oat bowl",
          meal_slot: "breakfast",
          servings: "1.00",
          status: "planned",
          ...progress,
        },
        {
          id: 2,
          recipe_name: "Pasta bowl",
          meal_slot: "lunch",
          servings: "1.00",
          status: "skipped",
          calories: "300.00",
          protein_grams: "15.00",
          carbohydrate_grams: null,
          fat_grams: null,
        },
      ],
      eaten_meals: [],
      planned_meal_count: 1,
      eaten_meal_count: 1,
      planned: progress,
      eaten: progress,
    },
    week: {
      planned_meal_count: 2,
      eaten_meal_count: 1,
      status_counts: { skipped: 1, replaced: 1, marked_eaten: 0 },
      planned: { ...progress, calories: "1500.00", protein_grams: "120.00" },
      eaten: progress,
      daily: Array.from({ length: 7 }, (_, index) => ({
        date: addDays(weekStart, index),
        planned_meal_count: index < 2 ? 1 : 0,
        eaten_meal_count: index === 0 ? 1 : 0,
        planned: index < 2 ? progress : zeroes,
        eaten: index === 0 ? progress : zeroes,
      })),
      prep_needed_count: 1,
      shopping_list_missing: true,
    },
    review: {
      reusable_meals: [
        { recipe_id: 1, recipe_name: "Oat bowl", planned_count: 2 },
      ],
      planning_gaps: [addDays(weekStart, 2)],
      next_week: {
        start_date: addDays(weekStart, 7),
        has_plan: false,
        can_copy: true,
      },
    },
  };
}

function currentWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateString(date);
}

function addDays(dateStringValue: string, days: number) {
  const date = new Date(`${dateStringValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateString(date);
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
