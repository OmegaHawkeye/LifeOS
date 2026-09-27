import { expect, test } from "@playwright/test";

test("sets up the initial owner and requires authenticator confirmation", async ({
  page,
}) => {
  let ownerExists = false;
  let createdOwner: Record<string, string> | null = null;

  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({
      status: 204,
      headers: { "set-cookie": "XSRF-TOKEN=test-token; Path=/; SameSite=Lax" },
    }),
  );

  await page.route("**/api/v1/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname.endsWith("/setup/status") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: { data: { required: !ownerExists } },
      });
      return;
    }

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({
        status: 401,
        json: { message: "Unauthenticated." },
      });
      return;
    }

    if (pathname.endsWith("/setup/owner") && method === "POST") {
      expect(route.request().headers()["x-xsrf-token"]).toBe("test-token");
      createdOwner = route.request().postDataJSON();
      ownerExists = true;
      await route.fulfill({
        status: 202,
        json: {
          data: { status: "setup_required", secret: "FIRST_RUN_SECRET" },
        },
      });
      return;
    }

    if (pathname.endsWith("/auth/two-factor/confirm") && method === "POST") {
      expect(route.request().headers()["x-xsrf-token"]).toBe("test-token");
      await route.fulfill({
        status: 200,
        json: {
          data: { id: 1, name: "Julian", email: "owner@example.test" },
        },
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

    await route.fulfill({ status: 404, json: { message: "Not found." } });
  });

  await page.goto("/finance");
  await expect(
    page.getByRole("heading", { name: "Set up your owner account" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Julian");
  await page.getByLabel("Email").fill("owner@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a considerably safer password");
  await page
    .getByLabel("Confirm password")
    .fill("a considerably safer password");
  await page.getByRole("button", { name: "Create owner account" }).click();

  await expect(
    page.getByRole("heading", { name: "Set up two-factor authentication" }),
  ).toBeVisible();
  await expect(page.getByText("FIRST_RUN_SECRET")).toBeVisible();
  await page.getByLabel("6-digit authenticator code").fill("123456");
  await page.getByRole("button", { name: "Confirm authenticator" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  expect(createdOwner).toEqual({
    name: "Julian",
    email: "owner@example.test",
    password: "a considerably safer password",
    password_confirmation: "a considerably safer password",
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Set up your owner account" }),
  ).toHaveCount(0);
});
