import {
  MobileApiError,
  type MobileAuthService,
} from "../auth/mobileAuthService";
import { MobileDashboardService } from "./mobileDashboardService";

describe("native Today dashboard data", () => {
  test("loads the current home-server summaries and defaults to hiding amounts", async () => {
    const request = jest.fn(async (path: string) => {
      if (path.startsWith("/finance/overview")) {
        return {
          data: {
            month: "2026-09",
            totals: [
              {
                currency: "EUR",
                income: "2000.00",
                spending: "850.00",
                net_cashflow: "1150.00",
              },
            ],
            category_breakdown: [],
          },
        };
      }

      if (path.startsWith("/fitness/dashboard")) {
        return {
          data: {
            active_goals: [],
            measurement_trends: [],
            weekly_workouts: {
              planned: 2,
              completed: 1,
              missed: 0,
              streak_days: 1,
            },
            personal_records: [],
            next_workout: null,
          },
        };
      }

      if (path.startsWith("/nutrition/dashboard")) {
        return {
          data: {
            week_start: "2026-09-21",
            week_end: "2026-09-27",
            timezone: "Europe/Vienna",
            target: {
              calories: null,
              protein_grams: null,
              carbohydrate_grams: null,
              fat_grams: null,
            },
            today: {
              date: "2026-09-21",
              plan: [],
              eaten_meals: [],
              planned_meal_count: 1,
              eaten_meal_count: 0,
              planned: {},
              eaten: {},
            },
            week: {},
            review: {},
          },
        };
      }

      if (path === "/routines") {
        return {
          data: {
            notifications_enabled: false,
            routines: [],
            recent_completions: [],
          },
        };
      }

      if (path === "/settings") {
        throw new Error("Settings are temporarily unavailable.");
      }

      throw new Error(`Unexpected dashboard request: ${path}`);
    });
    const service = new MobileDashboardService({
      api: { request } as unknown as Pick<MobileAuthService, "request">,
      now: () => new Date("2026-09-21T10:00:00.000Z"),
    });

    const snapshot = await service.loadTodaySnapshot();

    expect(snapshot.finance?.totals[0]?.net_cashflow).toBe("1150.00");
    expect(snapshot.fitness?.weekly_workouts.completed).toBe(1);
    expect(snapshot.nutrition?.today.planned_meal_count).toBe(1);
    expect(snapshot.routines?.routines).toEqual([]);
    expect(snapshot.maskSensitiveData).toBe(true);
    expect(request).toHaveBeenCalledWith("/finance/overview?month=2026-09");
    expect(request).toHaveBeenCalledWith(
      "/nutrition/dashboard?week_start=2026-09-21",
    );
  });

  test("keeps an unavailable optional module separate from available summaries", async () => {
    const request = jest.fn(async (path: string) => {
      if (path.startsWith("/finance/overview")) {
        throw new Error("Finance is unavailable.");
      }

      if (path === "/settings") {
        return { data: { mask_sensitive_data_by_default: false } };
      }

      if (path === "/routines") {
        return {
          data: {
            notifications_enabled: true,
            routines: [],
            recent_completions: [],
          },
        };
      }

      if (path.startsWith("/fitness/dashboard")) {
        return {
          data: { weekly_workouts: { completed: 2 }, next_workout: null },
        };
      }

      return {
        data: { today: { planned_meal_count: 0, eaten_meal_count: 0 } },
      };
    });
    const service = new MobileDashboardService({
      api: { request } as unknown as Pick<MobileAuthService, "request">,
      now: () => new Date("2026-09-21T10:00:00.000Z"),
    });

    const snapshot = await service.loadTodaySnapshot();

    expect(snapshot.finance).toBeNull();
    expect(snapshot.fitness?.weekly_workouts.completed).toBe(2);
    expect(snapshot.maskSensitiveData).toBe(false);
  });

  test("does not turn an authentication failure into an optional-card error", async () => {
    const request = jest.fn(async (path: string) => {
      if (path.startsWith("/finance/overview")) {
        throw new MobileApiError("Your session has expired.", 401);
      }

      return { data: {} };
    });
    const service = new MobileDashboardService({
      api: { request } as unknown as Pick<MobileAuthService, "request">,
    });

    await expect(service.loadTodaySnapshot()).rejects.toMatchObject({
      status: 401,
      message: "Your session has expired.",
    });
  });
});
