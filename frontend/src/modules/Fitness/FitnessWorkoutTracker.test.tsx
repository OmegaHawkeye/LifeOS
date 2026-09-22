// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/api/client";
import { FitnessWorkoutTracker } from "./FitnessWorkoutTracker";

vi.mock("@/api/client", () => ({ apiFetch: vi.fn() }));

describe("FitnessWorkoutTracker", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(workoutApi());
  });

  it("reuses a template, shows recent performance, logs a set, and completes the session", async () => {
    const user = userEvent.setup();
    render(<FitnessWorkoutTracker />);

    await user.click(
      await screen.findByRole("button", { name: "Start workout" }),
    );
    expect(await screen.findByText("Workout in progress")).toBeVisible();
    expect(
      screen.getByText("Target: 3 sets · 8-10 reps · 60.00 kg"),
    ).toBeVisible();
    expect(await screen.findByText(/Last time .*: 8 × 57.50 kg/)).toBeVisible();

    await user.type(screen.getByLabelText("Reps"), "8");
    await user.type(screen.getByLabelText("Load (kg)"), "62.5");
    await user.type(screen.getByLabelText("RPE"), "8.5");
    await user.click(screen.getByRole("button", { name: "Add set" }));

    expect(
      await screen.findByText(/Set 1: 8 reps · 62.50 kg · RPE 8.5/),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Finish workout" }));

    expect(await screen.findByText("Recent workouts")).toBeVisible();
    expect(screen.getByText(/Lower body A · Barbell squat/)).toBeVisible();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/v1/fitness/workout-sessions/1/exercises/11/sets",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("uses pounds when the account is configured for imperial units", async () => {
    const user = userEvent.setup();
    render(<FitnessWorkoutTracker measurementSystem="imperial" />);

    await user.click(
      await screen.findByRole("button", { name: "Start workout" }),
    );
    expect(await screen.findByText("Load (lb)")).toBeVisible();
    await user.type(screen.getByLabelText("Reps"), "8");
    await user.type(screen.getByLabelText("Load (lb)"), "135");
    await user.click(screen.getByRole("button", { name: "Add set" }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/v1/fitness/workout-sessions/1/exercises/11/sets",
        expect.objectContaining({
          body: expect.stringContaining('"weight_unit":"lb"'),
        }),
      ),
    );
  });
});

function workoutApi() {
  const squat = {
    id: 7,
    name: "Barbell squat",
    muscle_group: "legs",
    equipment: "barbell",
  };
  let sessions: Array<Record<string, unknown>> = [];
  let nextSessionId = 1;

  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    if (url === "/api/v1/fitness/exercises") {
      return jsonResponse([squat]);
    }
    if (url === "/api/v1/fitness/workout-templates") {
      return jsonResponse([
        {
          id: 3,
          name: "Lower body A",
          scheduled_days: [1, 4],
          exercises: [
            {
              exercise: squat,
              target_sets: 3,
              target_reps: "8-10",
              target_weight: "60.00",
              target_weight_unit: "kg",
            },
          ],
        },
      ]);
    }
    if (url === "/api/v1/fitness/workout-sessions" && method === "GET") {
      return jsonResponse(sessions);
    }
    if (url === "/api/v1/fitness/workout-sessions" && method === "POST") {
      const session = {
        id: nextSessionId++,
        template_id: 3,
        name: "Lower body A",
        status: "in_progress",
        started_at: "2026-09-20T10:00:00Z",
        duration_minutes: null,
        exercises: [
          {
            id: 11,
            exercise_name: "Barbell squat",
            exercise: squat,
            target_sets: 3,
            target_reps: "8-10",
            target_weight: "60.00",
            target_weight_unit: "kg",
            sets: [],
          },
        ],
      };
      sessions = [session];
      return jsonResponse(session, 201);
    }
    if (url.endsWith("/recent-performance")) {
      return jsonResponse({
        session: {
          id: 42,
          name: "Lower body A",
          completed_at: "2026-09-17T10:00:00Z",
        },
        exercise: squat,
        sets: [
          {
            id: 91,
            set_number: 1,
            reps: 8,
            weight: "57.50",
            weight_unit: "kg",
            rpe: "8.0",
            duration_seconds: null,
          },
        ],
      });
    }
    if (url.endsWith("/sets") && method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, string>;
      const active = sessions[0] as {
        exercises: Array<{ sets: Array<Record<string, unknown>> }>;
      };
      active.exercises[0].sets.push({
        id: 15,
        set_number: 1,
        reps: Number(body.reps),
        weight: Number(body.weight).toFixed(2),
        weight_unit: body.weight_unit,
        rpe: Number(body.rpe).toFixed(1),
        duration_seconds: null,
      });
      return jsonResponse(active.exercises[0].sets[0], 201);
    }
    if (url.endsWith("/complete") && method === "POST") {
      const active = sessions[0] as Record<string, unknown>;
      active.status = "completed";
      active.duration_minutes = 20;
      return jsonResponse(active);
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data }),
  } as Response;
}
