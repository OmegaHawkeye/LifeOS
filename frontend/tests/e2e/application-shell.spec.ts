import { expect, test } from "@playwright/test";

test("loads the LifeOS application shell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let signedIn = false;
  let settings = {
    timezone: "Europe/Vienna",
    currency: "EUR",
    measurement_system: "metric",
    theme: "system",
    mask_sensitive_data_by_default: true,
    notifications_enabled: false,
  };
  const financeAccounts = [
    {
      id: 1,
      name: "Everyday account",
      type: "checking",
      currency: "EUR",
      opening_balance: "250.0000",
      balance: "250.0000",
      include_in_net_worth: true,
    },
  ];
  const weeklyReview = {
    week_start: "2026-09-07",
    week_end: "2026-09-13",
    finance: { transaction_count: 0, totals: [] },
    fitness: { completed_workouts: 0, workout_minutes: 0 },
    nutrition: {
      meals_logged: 0,
      planned_meals: 0,
      calories: null,
      protein_grams: null,
    },
    review: null as null | {
      notes: string | null;
      next_week_focus: string | null;
      reviewed_at: string | null;
    },
  };

  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({
      status: 204,
      headers: { "set-cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax" },
    }),
  );

  await page.route("**/api/v1/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({
        status: signedIn ? 200 : 401,
        json: signedIn
          ? { data: { id: 1, name: "Julian", email: "owner@example.test" } }
          : { message: "Unauthenticated." },
      });
      return;
    }

    if (pathname.endsWith("/auth/login") && method === "POST") {
      expect(route.request().headers()["x-xsrf-token"]).toBe("test-token");
      await route.fulfill({
        status: 202,
        json: {
          data: { status: "setup_required", secret: "TESTBASE32SECRET" },
        },
      });
      return;
    }

    if (pathname.endsWith("/auth/two-factor/confirm") && method === "POST") {
      expect(route.request().headers()["x-xsrf-token"]).toBe("test-token");
      signedIn = true;
      await route.fulfill({
        status: 200,
        json: { data: { id: 1, name: "Julian", email: "owner@example.test" } },
      });
      return;
    }

    if (pathname.endsWith("/auth/logout") && method === "POST") {
      signedIn = false;
      await route.fulfill({ status: 204 });
      return;
    }

    if (pathname.endsWith("/settings") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: settings } });
      return;
    }

    if (pathname.endsWith("/settings") && method === "PATCH") {
      settings = { ...settings, ...route.request().postDataJSON() };
      await route.fulfill({ status: 200, json: { data: settings } });
      return;
    }

    if (pathname.endsWith("/account/export") && method === "GET") {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition":
            'attachment; filename="lifeos-export-2026-09-21.zip"',
          "Cache-Control": "private, no-store",
        },
        body: "test zip bytes",
      });
      return;
    }

    if (pathname.endsWith("/routines") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            notifications_enabled: settings.notifications_enabled,
            routines: [],
            recent_completions: [],
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/finance/overview") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            month: "2026-09",
            totals: [
              {
                currency: "EUR",
                income: "2000.00",
                spending: "765.44",
                net_cashflow: "1234.56",
              },
            ],
            category_breakdown: [],
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/finance/accounts") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: financeAccounts } });
      return;
    }

    if (pathname.endsWith("/finance/categories") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }

    if (pathname.endsWith("/finance/transactions") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }

    if (
      (pathname.endsWith("/finance/budgets") ||
        pathname.endsWith("/finance/subscriptions") ||
        pathname.endsWith("/finance/savings-goals")) &&
      method === "GET"
    ) {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }

    if (pathname.endsWith("/finance/assets") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }

    if (pathname.endsWith("/finance/net-worth") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            totals: [{ currency: "EUR", amount: "250.0000" }],
            accounts: [
              {
                id: 1,
                name: "Everyday account",
                type: "checking",
                currency: "EUR",
                balance: "250.0000",
                selected: true,
                included: true,
                excluded_reason: null,
              },
            ],
            assets: [],
            asset_groups: [],
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/dashboard/weekly-review") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: weeklyReview } });
      return;
    }

    if (pathname.endsWith("/dashboard/weekly-review") && method === "PUT") {
      const body = route.request().postDataJSON();
      weeklyReview.review = {
        notes: body.notes ?? null,
        next_week_focus: body.next_week_focus ?? null,
        reviewed_at: "2026-09-20T10:00:00+02:00",
      };
      await route.fulfill({
        status: 200,
        json: {
          data: {
            week_start: weeklyReview.week_start,
            ...weeklyReview.review,
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/nutrition/target") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            id: 1,
            calories: null,
            protein_grams: null,
            carbohydrate_grams: null,
            fat_grams: null,
            notes: null,
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/fitness/dashboard") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            active_goals: [],
            measurement_trends: [],
            weekly_workouts: {
              planned: 0,
              completed: 0,
              missed: 0,
              streak_days: 0,
            },
            personal_records: [],
            next_workout: {
              id: 9,
              name: "Strength A",
              scheduled_for: "2026-09-22",
              scheduled_days: [2],
            },
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/fitness/progress-photos") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }

    if (pathname.endsWith("/health/trends") && method === "GET") {
      const range =
        new URL(route.request().url()).searchParams.get("range") ?? "30d";
      await route.fulfill({
        status: 200,
        json: {
          data: {
            range,
            from: "2026-08-22",
            to: "2026-09-20",
            trends: healthTrends,
          },
        },
      });
      return;
    }

    if (
      pathname.endsWith("/fitness/progress-photos/monthly-review") &&
      method === "GET"
    ) {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            month: "2026-09",
            is_due: true,
            reviewed_at: null,
            notes: null,
            photo_count: 0,
            latest_photo_date: null,
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/nutrition/dashboard") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: nutritionDashboard } });
      return;
    }

    if (
      (pathname.endsWith("/nutrition/recipes") ||
        pathname.endsWith("/nutrition/meals") ||
        pathname.endsWith("/nutrition/plans") ||
        pathname.endsWith("/nutrition/shopping-lists")) &&
      method === "GET"
    ) {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Not found." } });
  });

  await page.goto("/finance");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finance" })).toHaveCount(0);
  await page.getByLabel("Email").fill("owner@example.test");
  await page.getByLabel("Password").fill("a long private password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Set up two-factor authentication" }),
  ).toBeVisible();
  await expect(page.getByText("TESTBASE32SECRET")).toBeVisible();
  await page.getByLabel("6-digit authenticator code").fill("123456");
  await page.getByRole("button", { name: "Confirm authenticator" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Next workout" }),
  ).toBeVisible();
  await expect(page.getByText("Strength A")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add a transaction" }),
  ).toHaveAttribute("href", "/finance");
  await expect(
    page.getByRole("link", { name: "Log a body metric" }),
  ).toHaveAttribute("href", "/fitness#body-metric-title");
  await expect(
    page.getByRole("link", { name: "Start a workout" }),
  ).toHaveAttribute("href", "/fitness#workout-title");
  await expect(page.getByRole("link", { name: "Plan a meal" })).toHaveAttribute(
    "href",
    "/nutrition#meal-plan-title",
  );
  await page.getByRole("link", { name: "Log a body metric" }).click();
  await expect(
    page.getByRole("heading", { name: "Add body metric" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Start a workout" }).click();
  await expect(page.getByRole("heading", { name: "Workouts" })).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Plan a meal" }).click();
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Health · last 7 days" }),
  ).toBeVisible();
  await expect(page.getByText("180 min")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Routines" })).toBeVisible();

  for (const [label, path] of [
    ["Finance", "finance"],
    ["Fitness", "fitness"],
    ["Nutrition", "nutrition"],
    ["Health", "health"],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
    if (label === "Finance") {
      await expect(
        page.getByRole("heading", { name: "Net worth & assets" }),
      ).toBeVisible();
      await expect(page.getByText("Net worth by currency")).toBeVisible();
    }
    if (label === "Health") {
      await expect(page.getByRole("heading", { name: "Steps" })).toBeVisible();
      await expect(page.getByLabel("Time range")).toHaveValue("30d");
    }
  }

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const exportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  expect((await exportDownload).suggestedFilename()).toBe(
    "lifeos-export-2026-09-21.zip",
  );
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Enable in-app reminders").check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await expect(page.getByLabel("Enable in-app reminders")).toBeChecked();

  await page.setViewportSize({ width: 1024, height: 1366 });
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Open wall mode" }).click();
  await expect(page.getByText("LifeOS · Today")).toBeVisible();
  await expect(page.getByText("Monthly cashflow hidden")).toBeVisible();
  await expect(page.getByText("Strength A")).toHaveCount(0);
  await page.getByRole("button", { name: "Reveal sensitive values" }).click();
  await expect(page.getByText("Strength A")).toHaveCount(2);
  await expect(page.getByText("Strength A").first()).toBeVisible();
  await expect(page.getByText(/1,235/)).toBeVisible();
  await page.getByRole("button", { name: "Switch to light" }).click();
  await expect(
    page.getByRole("button", { name: "Use ambient dark" }),
  ).toBeVisible();
  for (const viewport of [
    { width: 1024, height: 1366 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Today's focus" }),
    ).toBeVisible();
    await expect(page.locator("#wall-title")).toHaveCSS("font-size", "72px");
  }
  await page.getByRole("link", { name: "Exit display mode" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Open weekly review" }).click();
  await expect(
    page.getByRole("heading", { name: "Weekly review" }),
  ).toBeVisible();
  await expect(page.getByText("No transactions logged.")).toBeVisible();
});

test("requires confirmation before permanently deleting the account", async ({
  page,
}) => {
  let accountExists = true;
  let deletionPayload: Record<string, string> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({
        status: accountExists ? 200 : 401,
        json: accountExists
          ? { data: { id: 7, name: "Julian", email: "owner@example.test" } }
          : { message: "Unauthenticated." },
      });
      return;
    }

    if (pathname.endsWith("/settings") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            timezone: "Europe/Vienna",
            currency: "EUR",
            measurement_system: "metric",
            theme: "system",
            mask_sensitive_data_by_default: true,
            notifications_enabled: false,
          },
        },
      });
      return;
    }

    if (pathname.endsWith("/account") && method === "DELETE") {
      deletionPayload = route.request().postDataJSON();
      accountExists = false;
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Not found." } });
  });

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Delete account…" }).click();
  await expect(
    page.getByText("This permanently deletes your LifeOS account and data."),
  ).toBeVisible();
  await page
    .getByLabel("Password to confirm")
    .fill("correct horse battery staple");
  await page
    .getByLabel("Type your account email to confirm")
    .fill("owner@example.test");
  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(deletionPayload).toEqual({
    current_password: "correct horse battery staple",
    email_confirmation: "owner@example.test",
  });
});

const emptyNutrients = {
  calories: "0.00",
  protein_grams: "0.00",
  carbohydrate_grams: "0.00",
  fat_grams: "0.00",
};

const healthTrends = [
  ["calories", "kcal", "2100"],
  ["sleep", "hour", "52"],
  ["steps", "count", "40000"],
  ["weight", "kg", "80"],
  ["workouts", "min", "180"],
].map(([sample_type, unit, total]) => ({
  sample_type,
  unit,
  total: `${total}.0000`,
  latest_value: `${total}.0000`,
  change: "0.0000",
  direction: "steady",
  points: [{ date: "2026-09-20", value: `${total}.0000` }],
  source_counts: { manual: 0, imported: 1, sources: [] },
}));

const nutritionDashboard = {
  week_start: "2026-09-14",
  week_end: "2026-09-20",
  timezone: "Europe/Vienna",
  target: {
    calories: null,
    protein_grams: null,
    carbohydrate_grams: null,
    fat_grams: null,
  },
  today: {
    date: "2026-09-18",
    plan: [],
    eaten_meals: [],
    planned_meal_count: 0,
    eaten_meal_count: 0,
    planned: emptyNutrients,
    eaten: emptyNutrients,
  },
  week: {
    planned_meal_count: 0,
    eaten_meal_count: 0,
    status_counts: { skipped: 0, replaced: 0, marked_eaten: 0 },
    planned: emptyNutrients,
    eaten: emptyNutrients,
    daily: [],
    prep_needed_count: 0,
    shopping_list_missing: false,
  },
  review: {
    reusable_meals: [],
    planning_gaps: [],
    next_week: {
      start_date: "2026-09-21",
      has_plan: false,
      can_copy: false,
    },
  },
};
