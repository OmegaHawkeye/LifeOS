// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoutinesPanel } from "./RoutinesPanel";
import {
  completeRoutine,
  createRoutine,
  getRoutineOverview,
  snoozeRoutine,
} from "./routines";
import type { RoutineOverview } from "./routines";

vi.mock("./routines", () => ({
  completeRoutine: vi.fn(),
  createRoutine: vi.fn(),
  getRoutineOverview: vi.fn(),
  snoozeRoutine: vi.fn(),
}));

describe("RoutinesPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getRoutineOverview).mockResolvedValue(overview());
    vi.mocked(createRoutine).mockResolvedValue();
    vi.mocked(completeRoutine).mockResolvedValue();
    vi.mocked(snoozeRoutine).mockResolvedValue();
  });

  it("keeps reminders visibly opt-in and avoids a missed-routine backlog", async () => {
    render(
      <MemoryRouter>
        <RoutinesPanel />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Reminders are off/)).toBeVisible();
    expect(screen.getByText("Not scheduled today")).toBeVisible();
  });

  it("lets the owner complete a routine scheduled today", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoutinesPanel />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("button", { name: "Complete" }));
    await waitFor(() => expect(completeRoutine).toHaveBeenCalledWith(3));
  });

  it("shows enabled reminders and recent completion history", async () => {
    vi.mocked(getRoutineOverview).mockResolvedValue(overview(true));
    render(
      <MemoryRouter>
        <RoutinesPanel />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Reminder due: Stretch",
    );
    expect(
      screen.getByRole("heading", { name: "Recent completion history" }),
    ).toBeVisible();
    expect(screen.getByText("Meal prep · Completed recently")).toBeVisible();
  });

  it("creates a scheduled routine using its chosen domain and reminder time", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoutinesPanel />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText("New routine"), "Weigh in");
    await user.selectOptions(screen.getByLabelText("Area"), "fitness");
    await user.type(screen.getByLabelText("Reminder time"), "08:30");
    await user.click(screen.getByRole("button", { name: "Add routine" }));
    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({
        title: "Weigh in",
        domain: "fitness",
        frequency: "daily",
        reminder_time: "08:30",
      }),
    );
  });
});

function overview(withReminder = false): RoutineOverview {
  return {
    notifications_enabled: withReminder,
    recent_completions: withReminder
      ? [
          {
            routine_id: 8,
            title: "Meal prep",
            domain: "nutrition",
            completed_at: null,
          },
        ]
      : [],
    routines: [
      {
        id: 3,
        title: "Stretch",
        domain: "fitness",
        frequency: "weekly",
        days_of_week: [7],
        reminder_time: null,
        is_scheduled_today: true,
        status: "due",
        reminder_active: withReminder,
        snoozed_until: null,
      },
      {
        id: 4,
        title: "Monday planning",
        domain: "review",
        frequency: "weekly",
        days_of_week: [1],
        reminder_time: null,
        is_scheduled_today: false,
        status: "not_scheduled",
        reminder_active: false,
        snoozed_until: null,
      },
    ],
  };
}
