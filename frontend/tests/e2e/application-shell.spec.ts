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

    await route.fulfill({ status: 404, json: { message: "Not found." } });
  });

  await page.goto("/finance");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finance" })).toHaveCount(0);
  await page.getByLabel("Email").fill("owner@example.test");
  await page.getByLabel("Password").fill("a long private password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Set up two-factor authentication" }),
  ).toBeVisible();
  await expect(page.getByText("TESTBASE32SECRET")).toBeVisible();
  await page.getByLabel("6-digit authenticator code").fill("123456");
  await page.getByRole("button", { name: "Confirm authenticator" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  for (const [label, path] of [
    ["Finance", "finance"],
    ["Fitness", "fitness"],
    ["Nutrition", "nutrition"],
    ["Health", "health"],
  ]) {
    await page.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { name: label })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
  }

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 1366 });
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
