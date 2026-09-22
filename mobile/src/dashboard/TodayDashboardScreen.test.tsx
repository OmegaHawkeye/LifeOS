import { fireEvent, render, screen } from "@testing-library/react-native";
import type {
  MobileDashboardService,
  TodaySnapshot,
} from "./mobileDashboardService";
import { TodayDashboardScreen } from "./TodayDashboardScreen";

function dashboardService(snapshot: TodaySnapshot): MobileDashboardService {
  return {
    loadTodaySnapshot: jest.fn().mockResolvedValue(snapshot),
  } as unknown as MobileDashboardService;
}

describe("native Today dashboard", () => {
  test("shows real domain summaries, masks private amounts, and routes quick actions", async () => {
    const service = dashboardService({
      finance: {
        totals: [{ currency: "EUR", net_cashflow: "1150.00" }],
      },
      fitness: {
        weekly_workouts: { planned: 2, completed: 1, streak_days: 1 },
        next_workout: { name: "Upper body", scheduled_for: "2026-09-22" },
      },
      nutrition: {
        today: { planned_meal_count: 2, eaten_meal_count: 1 },
      },
      routines: {
        routines: [
          {
            id: 1,
            title: "Evening walk",
            status: "pending",
            is_scheduled_today: true,
          },
        ],
      },
      maskSensitiveData: true,
    });
    const onNavigate = jest.fn();

    await render(
      <TodayDashboardScreen service={service} onNavigate={onNavigate} />,
    );

    expect(await screen.findByText("Your day, in context")).toBeTruthy();
    expect(
      screen.getByText("Sensitive values are hidden by your settings."),
    ).toBeTruthy();
    expect(screen.queryByText("€1,150.00")).toBeNull();
    expect(screen.getByText("Upper body")).toBeTruthy();
    expect(screen.getByText("1 logged · 2 planned today")).toBeTruthy();
    expect(screen.getByText("Evening walk")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Record a transaction" }),
    );

    expect(onNavigate).toHaveBeenCalledWith("Finance");
  });

  test("guides the owner when all modules have no data yet", async () => {
    const service = dashboardService({
      finance: { totals: [] },
      fitness: {
        weekly_workouts: { planned: 0, completed: 0, streak_days: 0 },
        next_workout: null,
      },
      nutrition: { today: { planned_meal_count: 0, eaten_meal_count: 0 } },
      routines: { routines: [] },
      maskSensitiveData: false,
    });

    await render(
      <TodayDashboardScreen service={service} onNavigate={jest.fn()} />,
    );

    expect(
      await screen.findByText(
        "Record your first transaction to see this month's cashflow.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Log a workout to start your weekly view."),
    ).toBeTruthy();
    expect(
      screen.getByText("Plan or log a meal to see today's nutrition."),
    ).toBeTruthy();
    expect(
      screen.getByText("No routines due today. Add one when you're ready."),
    ).toBeTruthy();
  });

  test("shows a retry action after an unexpected dashboard failure", async () => {
    const service = {
      loadTodaySnapshot: jest
        .fn()
        .mockRejectedValueOnce(new Error("Offline"))
        .mockResolvedValueOnce({
          finance: { totals: [] },
          fitness: null,
          nutrition: null,
          routines: null,
          maskSensitiveData: true,
        }),
    } as unknown as MobileDashboardService;

    await render(
      <TodayDashboardScreen service={service} onNavigate={jest.fn()} />,
    );

    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );

    expect(await screen.findByText("Your day, in context")).toBeTruthy();
    expect(service.loadTodaySnapshot).toHaveBeenCalledTimes(2);
  });
});
