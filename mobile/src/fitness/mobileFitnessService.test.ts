import { MobileApiError } from "../auth/mobileAuthService";
import { MobileFitnessService } from "./mobileFitnessService";

const dashboard = {
  active_goals: [],
  measurement_trends: [],
  weekly_workouts: { planned: 3, completed: 2, missed: 0, streak_days: 4 },
  personal_records: [],
  next_workout: null,
};

function serviceWithRequest(request: jest.Mock) {
  return new MobileFitnessService({
    api: { request } as never,
  });
}

describe("MobileFitnessService", () => {
  test("loads owner fitness overview, body metrics, sessions, and preferences", async () => {
    const request = jest.fn(async (path: string) => {
      if (path === "/fitness/dashboard") return { data: dashboard };
      if (path === "/fitness/body-metrics?days=90") return { data: [] };
      if (path === "/fitness/workout-sessions") return { data: [] };
      return { data: { measurement_system: "imperial" } };
    });

    const snapshot = await serviceWithRequest(request).loadFitnessSnapshot();

    expect(snapshot.dashboard.weekly_workouts.completed).toBe(2);
    expect(snapshot.metrics).toEqual([]);
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.measurementSystem).toBe("imperial");
  });

  test("records a metric with the authenticated JSON API", async () => {
    const request = jest.fn().mockResolvedValue({ data: { id: 12 } });

    await serviceWithRequest(request).recordMetric({
      metric_type: "weight",
      value: 72.4,
      unit: "kg",
      measured_at: "2026-09-21T12:00:00Z",
      notes: null,
    });

    expect(request).toHaveBeenCalledWith("/fitness/body-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric_type: "weight",
        value: 72.4,
        unit: "kg",
        measured_at: "2026-09-21T12:00:00Z",
        notes: null,
      }),
    });
  });

  test("creates a fitness goal with the authenticated JSON API", async () => {
    const request = jest.fn().mockResolvedValue({ data: { id: 14 } });

    await serviceWithRequest(request).createGoal({
      metric_type: "weight",
      target_value: 70,
      unit: "kg",
      target_date: "2026-12-31",
    });

    expect(request).toHaveBeenCalledWith("/fitness/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric_type: "weight",
        target_value: 70,
        unit: "kg",
        target_date: "2026-12-31",
      }),
    });
  });

  test("does not swallow expired-session errors from settings", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({ data: dashboard })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce(new MobileApiError("Expired", 401));

    await expect(
      serviceWithRequest(request).loadFitnessSnapshot(),
    ).rejects.toThrow("Expired");
  });
});
