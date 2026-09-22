import { expect, test } from "@playwright/test";

test("records a finance transaction and shows it in the refreshed overview", async ({
  page,
}) => {
  const account = {
    id: 7,
    name: "Everyday account",
    type: "checking",
    currency: "EUR",
    opening_balance: "250.0000",
    balance: "250.0000",
    include_in_net_worth: true,
  };
  const transactions: Array<Record<string, unknown>> = [];
  let createdTransaction: Record<string, unknown> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname.endsWith("/me") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: { data: { id: 1, name: "Julian", email: "owner@example.test" } },
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
    if (pathname.endsWith("/finance/accounts") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [account] } });
      return;
    }
    if (pathname.endsWith("/finance/categories") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }
    if (pathname.endsWith("/finance/transactions") && method === "GET") {
      await route.fulfill({ status: 200, json: { data: transactions } });
      return;
    }
    if (pathname.endsWith("/finance/transactions") && method === "POST") {
      const body = request.postDataJSON();
      createdTransaction = {
        id: 31,
        account_id: body.account_id,
        type: body.type,
        amount: body.amount,
        currency: "EUR",
        description: body.description,
        occurred_at: body.occurred_at,
        category: null,
        payee: body.payee,
        tags: body.tags,
      };
      transactions.push(createdTransaction);
      await route.fulfill({ status: 201, json: { data: createdTransaction } });
      return;
    }
    if (pathname.endsWith("/finance/overview") && method === "GET") {
      const spending = transactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      );
      await route.fulfill({
        status: 200,
        json: {
          data: {
            month: new URL(request.url()).searchParams.get("month"),
            totals: transactions.length
              ? [
                  {
                    currency: "EUR",
                    income: "0.0000",
                    spending: spending.toFixed(4),
                    net_cashflow: (-spending).toFixed(4),
                  },
                ]
              : [],
            category_breakdown: [],
          },
        },
      });
      return;
    }
    if (
      [
        "/finance/budgets",
        "/finance/subscriptions",
        "/finance/savings-goals",
        "/finance/assets",
      ].some((path) => pathname.endsWith(path)) &&
      method === "GET"
    ) {
      await route.fulfill({ status: 200, json: { data: [] } });
      return;
    }
    if (pathname.endsWith("/finance/net-worth") && method === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            totals: [{ currency: "EUR", amount: account.balance }],
            accounts: [
              {
                id: account.id,
                name: account.name,
                type: account.type,
                currency: account.currency,
                balance: account.balance,
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

    await route.fulfill({
      status: 404,
      json: { message: `Unhandled test request: ${method} ${pathname}` },
    });
  });

  await page.goto("/finance");
  await expect(
    page.getByRole("heading", { name: "Finance", exact: true }),
  ).toBeVisible();
  await page.locator("#transaction-amount").fill("12.50");
  await page.getByLabel("Payee").fill("Local market");
  await page.locator("#transaction-description").fill("Fresh produce");
  await page.locator("#transaction-tags").fill("food, weekly");
  await page.getByRole("button", { name: "Add transaction" }).click();

  await expect(page.getByText("Fresh produce")).toBeVisible();
  await expect(page.getByText("1 record matching your filters")).toBeVisible();
  await expect(page.getByText(/12[.,]50/).first()).toBeVisible();
  expect(createdTransaction).toMatchObject({
    account_id: 7,
    type: "expense",
    amount: "12.50",
    description: "Fresh produce",
    payee: "Local market",
    tags: ["food", "weekly"],
  });
});
