import { MobileFinanceService } from "./mobileFinanceService";

describe("MobileFinanceService", () => {
  test("loads owner accounts, a selected month, and privacy settings from the API", async () => {
    const request = jest.fn(async (path: string) => {
      if (path === "/finance/accounts") {
        return {
          data: [
            {
              id: 3,
              name: "Checking",
              type: "checking",
              currency: "EUR",
              balance: "120.00",
            },
          ],
        };
      }
      if (path === "/finance/categories") return { data: [] };
      if (path.startsWith("/finance/transactions")) return { data: [] };
      if (path === "/finance/overview?month=2024-02") {
        return { data: { month: "2024-02", totals: [] } };
      }
      return {
        data: { currency: "EUR", mask_sensitive_data_by_default: true },
      };
    });
    const service = new MobileFinanceService({ api: { request } as never });

    const snapshot = await service.loadSnapshot("2024-02");

    expect(request).toHaveBeenCalledWith(
      "/finance/transactions?date_from=2024-02-01&date_to=2024-02-29",
    );
    expect(snapshot.accounts[0]?.name).toBe("Checking");
    expect(snapshot.categories).toEqual([]);
    expect(snapshot.currency).toBe("EUR");
    expect(snapshot.maskSensitiveData).toBe(true);
  });

  test("posts account and transaction data to the authenticated API", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 5,
          name: "Cash",
          currency: "EUR",
          type: "checking",
          balance: "0.00",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 8,
          account_id: 5,
          type: "expense",
          amount: "4.50",
          currency: "EUR",
          description: "Coffee",
          occurred_at: "2026-09-22T12:00:00Z",
          category: null,
          payee: null,
          tags: [],
        },
      });
    const service = new MobileFinanceService({ api: { request } as never });

    await service.createAccount("Cash", "EUR");
    await service.createTransaction({
      account_id: 5,
      type: "expense",
      amount: "4.50",
      occurred_at: "2026-09-22T12:00:00Z",
      description: "Coffee",
    });

    expect(request).toHaveBeenNthCalledWith(1, "/finance/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cash",
        type: "checking",
        currency: "EUR",
        opening_balance: "0",
      }),
    });
    expect(request).toHaveBeenNthCalledWith(2, "/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: 5,
        type: "expense",
        amount: "4.50",
        occurred_at: "2026-09-22T12:00:00Z",
        description: "Coffee",
      }),
    });
  });

  test("posts a new category to the authenticated API", async () => {
    const request = jest.fn().mockResolvedValue({
      data: {
        id: 9,
        name: "Groceries",
        type: "expense",
        color: null,
        is_archived: false,
      },
    });
    const service = new MobileFinanceService({ api: { request } as never });

    await service.createCategory("Groceries", "expense");

    expect(request).toHaveBeenCalledWith("/finance/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Groceries", type: "expense" }),
    });
  });
});
