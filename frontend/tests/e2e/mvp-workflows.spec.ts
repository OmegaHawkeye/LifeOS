import { expect, test } from "@playwright/test";

const owner = {
  id: 1,
  name: "Julian",
  email: "owner@example.test",
};

const settings = {
  timezone: "Europe/Vienna",
  currency: "EUR",
  measurement_system: "metric",
  theme: "system",
  mask_sensitive_data_by_default: true,
  notifications_enabled: false,
};

test("records a fitness measurement and goal from the Fitness workspace", async ({
  page,
}) => {
  const metrics: Array<Record<string, unknown>> = [];
  const goals: Array<Record<string, unknown>> = [];
  let metricBody: Record<string, unknown> | null = null;
  let goalBody: Record<string, unknown> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: owner } });
    } else if (pathname.endsWith("/settings") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: settings } });
    } else if (pathname.endsWith("/fitness/body-metrics") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: metrics } });
    } else if (
      pathname.endsWith("/fitness/body-metrics") &&
      method === "POST"
    ) {
      metricBody = request.postDataJSON();
      const metric = {
        id: 41,
        ...metricBody,
        measured_at: `${metricBody.measured_at}`,
        source: "manual",
      };
      metrics.unshift(metric);
      await route.fulfill({ status: 201, json: { data: metric } });
    } else if (pathname.endsWith("/fitness/goals") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: goals } });
    } else if (pathname.endsWith("/fitness/goals") && method === "POST") {
      goalBody = request.postDataJSON();
      const goal = { id: 51, status: "active", ...goalBody };
      goals.unshift(goal);
      await route.fulfill({ status: 201, json: { data: goal } });
    } else if (pathname.endsWith("/fitness/dashboard") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            active_goals: goals,
            measurement_trends: [],
            weekly_workouts: {
              planned: 0,
              completed: 0,
              missed: 0,
              streak_days: 0,
            },
            personal_records: [],
            next_workout: null,
          },
        },
      });
    } else if (
      [
        "/fitness/progress-photos",
        "/fitness/exercises",
        "/fitness/workout-templates",
        "/fitness/workout-sessions",
      ].some((path) => pathname.endsWith(path)) &&
      method === "GET"
    ) {
      await route.fulfill({ status: 200, json: { data: [] } });
    } else if (
      pathname.endsWith("/fitness/progress-photos/monthly-review") &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            month: new URL(request.url()).searchParams.get("month"),
            is_due: false,
            reviewed_at: null,
            notes: null,
            photo_count: 0,
            latest_photo_date: null,
          },
        },
      });
    } else {
      await route.fulfill({
        status: 404,
        json: { message: `Unhandled test request: ${method} ${pathname}` },
      });
    }
  });

  await page.goto("/fitness");
  const metricForm = page
    .getByRole("heading", { name: "Add body metric" })
    .locator("xpath=..");
  await metricForm.getByLabel("Value").fill("81.4");
  await metricForm.getByLabel("Progress note").fill("Morning check-in");
  await metricForm.getByRole("button", { name: "Save measurement" }).click();
  await expect(page.getByText("Morning check-in")).toBeVisible();

  const goalForm = page
    .getByRole("heading", { name: "Set a fitness goal" })
    .locator("xpath=..");
  await goalForm.getByLabel("Target value").fill("78");
  await goalForm.getByLabel("Progress note").fill("Build consistency");
  await goalForm.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByText("78 kg", { exact: true })).toBeVisible();

  expect(metricBody).toMatchObject({
    metric_type: "weight",
    value: "81.4",
    unit: "kg",
    notes: "Morning check-in",
  });
  expect(goalBody).toMatchObject({
    metric_type: "weight",
    target_value: "78",
    unit: "kg",
    notes: "Build consistency",
  });
});

test("creates a recipe and adds it to a day in the weekly meal plan", async ({
  page,
}) => {
  const recipes: Array<Record<string, unknown>> = [];
  const plans: Array<Record<string, unknown>> = [];
  let planBody: Record<string, unknown> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: owner } });
    } else if (pathname.endsWith("/settings") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: settings } });
    } else if (pathname.endsWith("/nutrition/target") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            id: 1,
            calories: "2200.00",
            protein_grams: "160.00",
            carbohydrate_grams: null,
            fat_grams: null,
            notes: null,
          },
        },
      });
    } else if (pathname.endsWith("/nutrition/recipes") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: recipes } });
    } else if (pathname.endsWith("/nutrition/recipes") && method === "POST") {
      const body = request.postDataJSON();
      const recipe = {
        id: 61,
        ...body,
        ingredients: body.ingredients.map(
          (ingredient: Record<string, unknown>, index: number) => ({
            id: index + 1,
            ...ingredient,
          }),
        ),
      };
      recipes.unshift(recipe);
      await route.fulfill({ status: 201, json: { data: recipe } });
    } else if (pathname.endsWith("/nutrition/plans") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: plans } });
    } else if (pathname.endsWith("/nutrition/plans") && method === "POST") {
      planBody = request.postDataJSON();
      const recipe = recipes.find((item) => item.id === planBody?.recipe_id);
      const plan = {
        id: 71,
        recipe_id: recipe?.id,
        recipe_name: recipe?.name,
        calories: recipe?.calories,
        protein_grams: recipe?.protein_grams,
        carbohydrate_grams: recipe?.carbohydrate_grams,
        fat_grams: recipe?.fat_grams,
        status: "planned",
        notes: null,
        ...planBody,
      };
      plans.push(plan);
      await route.fulfill({ status: 201, json: { data: plan } });
    } else if (pathname.endsWith("/nutrition/meals") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [] } });
    } else if (pathname.endsWith("/nutrition/dashboard") && method === "GET") {
      const emptyTotals = {
        calories: "0.00",
        protein_grams: "0.00",
        carbohydrate_grams: "0.00",
        fat_grams: "0.00",
      };
      await route.fulfill({
        status: 200,
        json: {
          data: {
            week_start: "2026-09-21",
            week_end: "2026-09-27",
            timezone: "Europe/Vienna",
            target: {
              calories: "2200.00",
              protein_grams: "160.00",
              carbohydrate_grams: null,
              fat_grams: null,
            },
            today: {
              date: "2026-09-21",
              plan: [],
              eaten_meals: [],
              planned_meal_count: 0,
              eaten_meal_count: 0,
              planned: emptyTotals,
              eaten: emptyTotals,
            },
            week: {
              planned_meal_count: plans.length,
              eaten_meal_count: 0,
              status_counts: {
                skipped: 0,
                replaced: 0,
                marked_eaten: 0,
              },
              planned: emptyTotals,
              eaten: emptyTotals,
              daily: [],
              prep_needed_count: 0,
              shopping_list_missing: false,
            },
            review: {
              reusable_meals: [],
              planning_gaps: [],
              next_week: {
                start_date: "2026-09-28",
                has_plan: false,
                can_copy: false,
              },
            },
          },
        },
      });
    } else if (
      pathname.endsWith("/nutrition/shopping-lists") &&
      method === "GET"
    ) {
      await route.fulfill({ status: 200, json: { data: [] } });
    } else {
      await route.fulfill({
        status: 404,
        json: { message: `Unhandled test request: ${method} ${pathname}` },
      });
    }
  });

  await page.goto("/nutrition");
  await page.getByLabel("Recipe name").fill("Protein oats");
  await page.getByLabel("Servings", { exact: true }).fill("1");
  await page.getByLabel("Calories per serving").fill("480");
  await page.getByLabel("Protein per serving (g)").fill("35");
  await page.getByLabel("Ingredient 1").fill("Oats");
  await page.getByLabel("Quantity 1").fill("80");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(
    page.locator("li").filter({ hasText: "Protein oats" }).first(),
  ).toBeVisible();

  const recipeForDay = page
    .locator('select[aria-label^="Recipe for "]')
    .first();
  await recipeForDay.selectOption("61");
  await page.getByRole("button", { name: "Add to day" }).first().click();
  await expect(
    page.getByRole("status").filter({ hasText: "Meal added to the plan." }),
  ).toBeVisible();
  await expect(page.getByText("breakfast · 480 kcal")).toBeVisible();
  expect(planBody).toMatchObject({
    recipe_id: 61,
    meal_slot: "breakfast",
    servings: 1,
  });
});

test("saves a weekly review and shows the confirmation", async ({ page }) => {
  let review = {
    notes: null as string | null,
    next_week_focus: null as string | null,
    reviewed_at: null as string | null,
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: owner } });
    } else if (pathname.endsWith("/settings") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: settings } });
    } else if (
      pathname.endsWith("/dashboard/weekly-review") &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            week_start: "2026-09-14",
            week_end: "2026-09-20",
            finance: { transaction_count: 1, totals: [] },
            fitness: { completed_workouts: 1, workout_minutes: 45 },
            nutrition: {
              meals_logged: 3,
              planned_meals: 4,
              calories: "1440.00",
              protein_grams: "105.00",
            },
            review,
          },
        },
      });
    } else if (
      pathname.endsWith("/dashboard/weekly-review") &&
      method === "PUT"
    ) {
      const body = request.postDataJSON();
      review = {
        notes: body.notes,
        next_week_focus: body.next_week_focus,
        reviewed_at: "2026-09-20T10:00:00+02:00",
      };
      await route.fulfill({
        status: 200,
        json: { data: { week_start: body.week_start, ...review } },
      });
    } else {
      await route.fulfill({
        status: 404,
        json: { message: `Unhandled test request: ${method} ${pathname}` },
      });
    }
  });

  await page.goto("/review");
  await page
    .getByLabel("What went well, and what would you change?")
    .fill("Logged meals and workouts.");
  await page
    .getByLabel("One focus for next week")
    .fill("Keep planning on Sunday.");
  await page.getByRole("button", { name: "Save weekly review" }).click();

  await expect(page.getByRole("status")).toHaveText("Review saved.");
  expect(review).toMatchObject({
    notes: "Logged meals and workouts.",
    next_week_focus: "Keep planning on Sunday.",
  });
});
