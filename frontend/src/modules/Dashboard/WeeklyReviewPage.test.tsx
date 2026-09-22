// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyReviewPage } from "./WeeklyReviewPage";
import { getWeeklyReview, saveWeeklyReview } from "../Routines/routines";
import type { WeeklyReviewSummary } from "../Routines/routines";

vi.mock("../Routines/routines", () => ({
  getWeeklyReview: vi.fn(),
  saveWeeklyReview: vi.fn(),
}));

describe("WeeklyReviewPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getWeeklyReview).mockResolvedValue(summary());
    vi.mocked(saveWeeklyReview).mockResolvedValue(
      summary({
        notes: "Good consistency.",
        next_week_focus: "Plan two workouts.",
      }),
    );
  });

  it("summarizes the three domains and saves a focus for the coming week", async () => {
    const user = userEvent.setup();
    render(<WeeklyReviewPage />);
    expect(await screen.findByText("2 transactions")).toBeVisible();
    expect(screen.getByText("2 workouts completed")).toBeVisible();
    expect(screen.getByText("5 meals logged · 4 planned")).toBeVisible();
    await user.type(
      screen.getByLabelText(/What went well/),
      "Good consistency.",
    );
    await user.type(
      screen.getByLabelText("One focus for next week"),
      "Plan two workouts.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save weekly review" }),
    );
    await waitFor(() =>
      expect(saveWeeklyReview).toHaveBeenCalledWith({
        week_start: "2026-09-07",
        notes: "Good consistency.",
        next_week_focus: "Plan two workouts.",
      }),
    );
    expect(await screen.findByText("Review saved.")).toBeVisible();
  });

  it("labels missing measurement coverage instead of reporting zero", async () => {
    vi.mocked(getWeeklyReview).mockResolvedValue(
      summary(null, {
        fitness: { completed_workouts: 1, workout_minutes: null },
        nutrition: {
          meals_logged: 1,
          planned_meals: 0,
          calories: null,
          protein_grams: null,
        },
      }),
    );

    render(<WeeklyReviewPage />);

    expect(
      await screen.findByText("Workout duration not fully recorded."),
    ).toBeVisible();
    expect(screen.getByText("No calorie totals recorded.")).toBeVisible();
  });
});

function summary(
  review: WeeklyReviewSummary["review"] = null,
  metrics: Pick<WeeklyReviewSummary, "fitness" | "nutrition"> = {
    fitness: { completed_workouts: 2, workout_minutes: 90 },
    nutrition: {
      meals_logged: 5,
      planned_meals: 4,
      calories: "1250.00",
      protein_grams: "80.00",
    },
  },
): WeeklyReviewSummary {
  return {
    week_start: "2026-09-07",
    week_end: "2026-09-13",
    finance: {
      transaction_count: 2,
      totals: [{ currency: "EUR", income: "2500.0000", expenses: "300.0000" }],
    },
    ...metrics,
    review,
  };
}
