import { fireEvent, render, screen } from "@testing-library/react-native";
import { FinanceScreen } from "./FinanceScreen";
import type {
  FinanceSnapshot,
  MobileFinanceService,
} from "./mobileFinanceService";

const emptySnapshot: FinanceSnapshot = {
  accounts: [],
  transactions: [],
  overview: { month: "2026-09", totals: [] },
  currency: "EUR",
  maskSensitiveData: false,
};

describe("FinanceScreen", () => {
  test("creates the first account and records a transaction using persisted data", async () => {
    let snapshot = emptySnapshot;
    const service: Pick<
      MobileFinanceService,
      "loadSnapshot" | "createAccount" | "createTransaction"
    > = {
      loadSnapshot: jest.fn(async () => snapshot),
      createAccount: jest.fn(async (name, currency) => {
        snapshot = {
          ...snapshot,
          accounts: [
            { id: 1, name, type: "checking", currency, balance: "12.50" },
          ],
        };
        return snapshot.accounts[0]!;
      }),
      createTransaction: jest.fn(async (transaction) => {
        snapshot = {
          ...snapshot,
          transactions: [
            {
              id: 4,
              ...transaction,
              currency: "EUR",
              category: null,
              payee: null,
              tags: [],
            },
          ],
          overview: {
            month: "2026-09",
            totals: [
              {
                currency: "EUR",
                income: "0.00",
                spending: "4.50",
                net_cashflow: "-4.50",
              },
            ],
          },
        };
        return snapshot.transactions[0]!;
      }),
    };
    await render(<FinanceScreen service={service} />);

    await fireEvent.changeText(
      screen.getByPlaceholderText("e.g. Current account"),
      "Daily account",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );
    expect(await screen.findByText("Record a transaction")).toBeTruthy();
    expect(service.createAccount).toHaveBeenCalledWith("Daily account", "EUR");

    await fireEvent.changeText(
      screen.getByLabelText("Transaction amount"),
      "4,50",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Transaction description"),
      "Coffee",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Save transaction" }),
    );

    expect(service.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 1,
        amount: "4.50",
        description: "Coffee",
        type: "expense",
      }),
    );
    expect(await screen.findByText("Coffee")).toBeTruthy();
  });

  test("masks sensitive amounts and offers retry when finance data fails to load", async () => {
    const privateSnapshot = {
      ...emptySnapshot,
      accounts: [
        {
          id: 1,
          name: "Checking",
          type: "checking",
          currency: "EUR",
          balance: "250.00",
        },
      ],
      maskSensitiveData: true,
      overview: {
        month: "2026-09",
        totals: [
          {
            currency: "EUR",
            income: "400.00",
            spending: "150.00",
            net_cashflow: "250.00",
          },
        ],
      },
    };
    const service: Pick<
      MobileFinanceService,
      "loadSnapshot" | "createAccount" | "createTransaction"
    > = {
      loadSnapshot: jest
        .fn()
        .mockResolvedValueOnce(privateSnapshot)
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(privateSnapshot),
      createAccount: jest.fn(),
      createTransaction: jest.fn(),
    };
    await render(<FinanceScreen service={service} />);

    expect(screen.getAllByText("••••").length).toBeGreaterThan(1);
    expect(screen.queryByText("€250.00")).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "Previous month" }),
    );
    expect(await screen.findByText("Finance data is unavailable")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Accounts")).toBeTruthy();
  });
});
