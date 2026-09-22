import { fireEvent, render, screen } from "@testing-library/react-native";
import { NutritionScreen } from "./NutritionScreen";
import type {
  MobileNutritionService,
  NutritionDashboard,
} from "./mobileNutritionService";

const dashboard: NutritionDashboard = {
  week_start: "2026-09-21",
  week_end: "2026-09-27",
  target: {
    calories: "2000",
    protein_grams: "120",
    carbohydrate_grams: "240",
    fat_grams: "65",
  },
  today: {
    date: "2026-09-22",
    plan: [],
    eaten_meals: [],
    planned_meal_count: 0,
    eaten_meal_count: 0,
    planned: {
      calories: null,
      protein_grams: null,
      carbohydrate_grams: null,
      fat_grams: null,
    },
    eaten: {
      calories: null,
      protein_grams: null,
      carbohydrate_grams: null,
      fat_grams: null,
    },
  },
};

describe("NutritionScreen", () => {
  test("shows persisted targets and meals and can log a meal", async () => {
    let snapshot = dashboard;
    const service: Pick<MobileNutritionService, "loadDashboard" | "logMeal"> = {
      loadDashboard: jest.fn(async () => snapshot),
      logMeal: jest.fn(async (meal) => {
        snapshot = {
          ...dashboard,
          today: {
            ...dashboard.today,
            eaten_meal_count: 1,
            eaten: {
              ...dashboard.today.eaten,
              calories: String(meal.calories),
            },
            eaten_meals: [
              {
                id: 9,
                name: meal.name,
                meal_type: meal.meal_type,
                calories: String(meal.calories),
                protein_grams: String(meal.protein_grams),
                carbohydrate_grams: null,
                fat_grams: null,
              },
            ],
          },
        };
      }),
    };

    await render(<NutritionScreen service={service} />);
    expect(await screen.findByText("— / 2,000 kcal")).toBeTruthy();
    expect(screen.getByText("No meals logged today.")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Snack" }));
    await fireEvent.changeText(screen.getByLabelText("Meal name"), "Apple");
    await fireEvent.changeText(screen.getByLabelText("Meal calories"), "95");
    await fireEvent.changeText(screen.getByLabelText("Meal protein"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Save meal" }));

    expect(service.logMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Apple",
        meal_type: "snack",
        calories: 95,
        protein_grams: 1,
        servings: 1,
      }),
    );
    expect(await screen.findByText("Apple")).toBeTruthy();
  });

  test("shows an error and retries when the server cannot load nutrition data", async () => {
    const service: Pick<MobileNutritionService, "loadDashboard" | "logMeal"> = {
      loadDashboard: jest
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(dashboard),
      logMeal: jest.fn(),
    };
    await render(<NutritionScreen service={service} />);

    expect(
      await screen.findByText("Nutrition data is unavailable"),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Today's plan")).toBeTruthy();
  });
});
