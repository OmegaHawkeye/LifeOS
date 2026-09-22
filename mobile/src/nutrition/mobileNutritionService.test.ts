import { MobileNutritionService } from "./mobileNutritionService";

describe("MobileNutritionService", () => {
  test("loads weekly dashboard using the local Monday date", async () => {
    const request = jest.fn().mockResolvedValue({ data: { today: {} } });
    const service = new MobileNutritionService({
      api: { request } as never,
      now: () => new Date(2026, 8, 22, 9),
    });

    await service.loadDashboard();

    expect(request).toHaveBeenCalledWith(
      "/nutrition/dashboard?week_start=2026-09-21",
    );
  });

  test("posts manually logged meals to the authenticated API", async () => {
    const request = jest.fn().mockResolvedValue({ data: {} });
    const service = new MobileNutritionService({ api: { request } as never });
    const meal = {
      name: "Oatmeal",
      meal_type: "breakfast" as const,
      eaten_at: "2026-09-22T08:00:00.000Z",
      servings: 1,
      calories: 320,
      protein_grams: 14,
      carbohydrate_grams: null,
      fat_grams: null,
    };

    await service.logMeal(meal);

    expect(request).toHaveBeenCalledWith("/nutrition/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meal),
    });
  });

  test("patches the persisted daily nutrition target", async () => {
    const request = jest.fn().mockResolvedValue({ data: {} });
    const service = new MobileNutritionService({ api: { request } as never });
    const target = {
      calories: 2100,
      protein_grams: 130,
      carbohydrate_grams: 240,
      fat_grams: 65,
    };

    await service.updateTarget(target);

    expect(request).toHaveBeenCalledWith("/nutrition/target", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });
  });
});
