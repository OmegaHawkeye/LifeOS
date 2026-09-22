// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FitnessDashboardSummary } from "./FitnessDashboardSummary";
import {
  getFitnessDashboard,
  startRecommendedWorkout,
} from "./fitnessDashboard";
import type { FitnessDashboard } from "./fitnessDashboard";

vi.mock("./fitnessDashboard", () => ({
  getFitnessDashboard: vi.fn(),
  startRecommendedWorkout: vi.fn(),
}));

describe("FitnessDashboardSummary", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getFitnessDashboard).mockResolvedValue(dashboard());
    vi.mocked(startRecommendedWorkout).mockResolvedValue();
  });

  it("shows calm training context, body trends, goals, and personal records", async () => {
    render(<FitnessDashboardSummary onWorkoutStarted={vi.fn()} />);

    expect(await screen.findByText("Fitness overview")).toBeVisible();
    expect(screen.getByText("2 / 3")).toBeVisible();
    expect(
      screen.getByText(/1 planned session still open to adjust/),
    ).toBeVisible();
    expect(screen.getByText(/80 kg · down 2/)).toBeVisible();
    expect(screen.getByText(/Barbell squat/)).toBeVisible();
    expect(screen.getByText(/weight goal · 75 kg/)).toBeVisible();
    expect(screen.queryByText(/missed workout/i)).not.toBeInTheDocument();
  });

  it("starts the next planned workout and refreshes the active-session state", async () => {
    const user = userEvent.setup();
    const onWorkoutStarted = vi.fn();
    render(<FitnessDashboardSummary onWorkoutStarted={onWorkoutStarted} />);

    await user.click(
      await screen.findByRole("button", { name: "Start this workout" }),
    );

    await waitFor(() => {
      expect(startRecommendedWorkout).toHaveBeenCalledWith(9);
      expect(onWorkoutStarted).toHaveBeenCalledOnce();
    });
    expect(getFitnessDashboard).toHaveBeenCalledTimes(2);
  });
});

function dashboard(): FitnessDashboard {
  return {
    active_goals: [
      {
        id: 1,
        metric_type: "weight",
        target_value: "75",
        unit: "kg",
        target_date: null,
      },
    ],
    measurement_trends: [
      {
        metric_type: "weight",
        unit: "kg",
        latest_value: "80",
        change: "-2.0000",
        direction: "down",
        points: [
          { date: "2026-08-01", value: "82" },
          { date: "2026-09-19", value: "80" },
        ],
      },
    ],
    weekly_workouts: { planned: 3, completed: 2, missed: 1, streak_days: 1 },
    personal_records: [
      {
        exercise_id: 12,
        exercise_name: "Barbell squat",
        weight: "100",
        weight_unit: "kg",
        reps: 1,
        achieved_at: "2026-09-19",
      },
    ],
    next_workout: {
      id: 9,
      name: "Sunday mobility",
      scheduled_for: "2026-09-20",
      scheduled_days: [7],
    },
  };
}
