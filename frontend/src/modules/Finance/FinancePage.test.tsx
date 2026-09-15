// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinancePage } from "./FinancePage";

const financeApi = vi.hoisted(() => ({
  createFinanceTransaction: vi.fn(),
  createFinanceBudget: vi.fn(),
  createFinanceSavingsGoal: vi.fn(),
  createFinanceSubscription: vi.fn(),
  deleteFinanceTransaction: vi.fn(),
  deleteFinanceBudget: vi.fn(),
  deleteFinanceSavingsGoal: vi.fn(),
  getFinanceBudgets: vi.fn(),
  getFinanceSavingsGoals: vi.fn(),
  getFinanceSubscriptions: vi.fn(),
  getFinanceAccounts: vi.fn(),
  getFinanceCategories: vi.fn(),
  getFinanceOverview: vi.fn(),
  getFinanceTransactions: vi.fn(),
  updateFinanceTransaction: vi.fn(),
  updateFinanceSubscription: vi.fn(),
}));

vi.mock("./finance", () => financeApi);

const account = {
  id: 7,
  name: "Everyday account",
  type: "checking" as const,
  currency: "EUR",
  opening_balance: "100.0000",
  balance: "100.0000",
};
const category = {
  id: 12,
  name: "Groceries",
  type: "expense" as const,
  color: null,
  is_archived: false,
};
const transaction = {
  id: 22,
  account_id: account.id,
  type: "expense" as const,
  amount: "18.5000",
  currency: "EUR",
  description: "Market shop",
  occurred_at: "2026-09-14T12:00:00.000Z",
  category: { id: category.id, name: category.name, type: category.type },
  payee: "Market",
  tags: ["food"],
};
const overview = {
  month: "2026-09",
  totals: [
    {
      currency: "EUR",
      income: "2500.0000",
      spending: "18.5000",
      net_cashflow: "2481.5000",
    },
  ],
  category_breakdown: [
    {
      category_id: category.id,
      category_name: category.name,
      type: "expense" as const,
      currency: "EUR",
      total: "18.5000",
      transaction_count: 1,
    },
  ],
};
const budget = {
  id: 4,
  category_id: category.id,
  category_name: category.name,
  month: "2026-09",
  currency: "EUR",
  target_amount: "100.0000",
  spent: "125.0000",
  remaining: "-25.0000",
  is_over_budget: true,
};
const subscription = {
  id: 5,
  name: "Cloud storage",
  account_id: account.id,
  account_name: account.name,
  category_id: null,
  category_name: null,
  amount: "2.9900",
  currency: "EUR",
  billing_cycle: "monthly" as const,
  next_renewal_on: "2026-09-16",
  status: "active" as const,
};

describe("FinancePage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.history.replaceState({}, "", "/finance");
    financeApi.createFinanceTransaction.mockResolvedValue(transaction);
    financeApi.createFinanceBudget.mockResolvedValue(budget);
    financeApi.createFinanceSavingsGoal.mockResolvedValue({});
    financeApi.createFinanceSubscription.mockResolvedValue(subscription);
    financeApi.deleteFinanceTransaction.mockResolvedValue(undefined);
    financeApi.deleteFinanceBudget.mockResolvedValue(undefined);
    financeApi.deleteFinanceSavingsGoal.mockResolvedValue(undefined);
    financeApi.getFinanceBudgets.mockResolvedValue([budget]);
    financeApi.getFinanceSavingsGoals.mockResolvedValue([]);
    financeApi.getFinanceSubscriptions.mockResolvedValue([subscription]);
    financeApi.getFinanceAccounts.mockResolvedValue([account]);
    financeApi.getFinanceCategories.mockResolvedValue([category]);
    financeApi.getFinanceOverview.mockResolvedValue(overview);
    financeApi.getFinanceTransactions.mockResolvedValue([transaction]);
    financeApi.updateFinanceTransaction.mockResolvedValue(transaction);
    financeApi.updateFinanceSubscription.mockResolvedValue({
      ...subscription,
      status: "paused",
    });
  });

  it("records a quick transaction and refreshes the monthly cashflow", async () => {
    const user = userEvent.setup();
    render(<FinancePage />);

    expect(await screen.findByText("Market shop")).toBeVisible();
    expect(screen.getByText("€2,500.00")).toBeVisible();
    await user.type(screen.getByLabelText("Amount"), "18.50");
    await user.type(screen.getByLabelText(/Note/), "Market shop");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    await waitFor(() =>
      expect(financeApi.createFinanceTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: account.id,
          amount: "18.5",
          description: "Market shop",
          type: "expense",
        }),
      ),
    );
    await waitFor(() =>
      expect(financeApi.getFinanceOverview).toHaveBeenCalledTimes(2),
    );
    expect(financeApi.getFinanceTransactions).toHaveBeenLastCalledWith({});
  });

  it("applies transaction filters and clears them back to the unfiltered list", async () => {
    const user = userEvent.setup();
    render(<FinancePage />);
    await screen.findByText("Market shop");

    await user.selectOptions(
      screen.getByLabelText("Category", { selector: "select" }),
      String(category.id),
    );
    await user.type(screen.getByLabelText("Tag"), "food");

    await waitFor(() =>
      expect(financeApi.getFinanceTransactions).toHaveBeenLastCalledWith({
        category_id: category.id,
        tag: "food",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() =>
      expect(financeApi.getFinanceTransactions).toHaveBeenLastCalledWith({}),
    );
  });

  it("shows actionable budget and renewal alerts and lets the owner pause a subscription", async () => {
    const user = userEvent.setup();
    render(<FinancePage />);

    expect(
      await screen.findByText(/Groceries is over its EUR budget by/),
    ).toBeVisible();
    expect(screen.getByText(/Cloud storage renews/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() =>
      expect(financeApi.updateFinanceSubscription).toHaveBeenCalledWith(5, {
        status: "paused",
      }),
    );
    expect(financeApi.getFinanceBudgets).toHaveBeenCalledWith("2026-09");
  });
});
