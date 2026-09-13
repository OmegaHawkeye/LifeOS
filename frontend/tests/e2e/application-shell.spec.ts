import { expect, test } from "@playwright/test";

test("loads the LifeOS application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "LifeOS" })).toBeVisible();
  await expect(page.getByText("Foundation ready")).toBeVisible();
});
