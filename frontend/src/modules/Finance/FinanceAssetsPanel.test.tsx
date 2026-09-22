// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceAssetsPanel } from "./FinanceAssetsPanel";
import {
  createFinanceAsset,
  createFinanceAssetValuation,
  getFinanceAccounts,
  getFinanceAssets,
  getFinanceAssetValuations,
  getFinanceNetWorth,
  updateFinanceAccount,
  updateFinanceAsset,
} from "./finance";

vi.mock("./finance", () => ({
  createFinanceAsset: vi.fn(),
  createFinanceAssetValuation: vi.fn(),
  getFinanceAccounts: vi.fn(),
  getFinanceAssets: vi.fn(),
  getFinanceAssetValuations: vi.fn(),
  getFinanceNetWorth: vi.fn(),
  updateFinanceAccount: vi.fn(),
  updateFinanceAsset: vi.fn(),
}));

describe("FinanceAssetsPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getFinanceAccounts).mockResolvedValue([
      {
        id: 1,
        name: "Brokerage",
        type: "investment",
        currency: "EUR",
        opening_balance: "1000.0000",
        balance: "1000.0000",
        include_in_net_worth: true,
      },
    ]);
    vi.mocked(getFinanceAssets).mockResolvedValue([
      {
        id: 4,
        name: "Index fund holdings",
        asset_type: "investment",
        account_id: 1,
        account_name: "Brokerage",
        currency: "EUR",
        cost_basis: "500.0000",
        current_value: "700.0000",
        valued_at: "2026-09-20",
        source: "manual",
        include_in_net_worth: true,
        is_archived: false,
      },
    ]);
    vi.mocked(getFinanceNetWorth).mockResolvedValue({
      totals: [{ currency: "EUR", amount: "700.0000" }],
      accounts: [
        {
          id: 1,
          name: "Brokerage",
          type: "investment",
          currency: "EUR",
          balance: "1000.0000",
          selected: true,
          included: false,
          excluded_reason: "linked_asset",
        },
      ],
      assets: [],
      asset_groups: [
        {
          asset_type: "investment",
          currency: "EUR",
          asset_count: 1,
          amount: "700.0000",
        },
      ],
    });
    vi.mocked(getFinanceAssetValuations).mockResolvedValue([
      {
        id: 2,
        value: "700.0000",
        valued_at: "2026-09-20",
        source: "manual",
        notes: null,
      },
    ]);
    vi.mocked(createFinanceAsset).mockResolvedValue(undefined);
    vi.mocked(createFinanceAssetValuation).mockResolvedValue(undefined);
    vi.mocked(updateFinanceAccount).mockResolvedValue(undefined);
    vi.mocked(updateFinanceAsset).mockResolvedValue(undefined);
  });

  it("shows value history, labels manual sources, and keeps linked balances from double-counting", async () => {
    render(<FinanceAssetsPanel />);

    expect(await screen.findByText("Index fund holdings")).toBeVisible();
    expect(screen.getByText(/Manual value/)).toBeVisible();
    expect(screen.getAllByText("€700.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Excluded while linked asset values are included."),
    ).toBeVisible();
    expect(screen.getByText("History")).toBeVisible();
  });

  it("allows account net-worth selection to be changed", async () => {
    const user = userEvent.setup();
    render(<FinanceAssetsPanel />);

    await user.click(
      await screen.findByLabelText("Include Brokerage in net worth"),
    );

    expect(updateFinanceAccount).toHaveBeenCalledWith(1, false);
  });
});
