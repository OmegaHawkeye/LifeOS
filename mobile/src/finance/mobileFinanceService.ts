import type { MobileAuthService } from "../auth/mobileAuthService";

type ApiEnvelope<T> = { data: T };

export type FinanceAccount = {
  id: number;
  name: string;
  type: string;
  currency: string;
  balance: string;
};

export type FinanceCategory = {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string | null;
  is_archived: boolean;
};

export type FinanceTransaction = {
  id: number;
  account_id: number;
  type: "income" | "expense";
  amount: string;
  currency: string;
  description: string | null;
  occurred_at: string;
  category: { id: number; name: string; type: string } | null;
  payee: string | null;
  tags: string[];
};

export type FinanceOverview = {
  month: string;
  totals: {
    currency: string;
    income: string;
    spending: string;
    net_cashflow: string;
  }[];
};

export type FinanceSnapshot = {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  overview: FinanceOverview;
  currency: string;
  maskSensitiveData: boolean;
};

export type NewFinanceTransaction = {
  account_id: number;
  category_id?: number | null;
  type: "income" | "expense";
  amount: string;
  occurred_at: string;
  description: string | null;
};

type MobileFinanceServiceOptions = {
  api: Pick<MobileAuthService, "request">;
};

export class MobileFinanceService {
  private readonly api: Pick<MobileAuthService, "request">;

  constructor(options: MobileFinanceServiceOptions) {
    this.api = options.api;
  }

  async loadSnapshot(month: string): Promise<FinanceSnapshot> {
    const { from, to } = monthRange(month);
    const [accounts, categories, transactions, overview, settings] = await Promise.all([
      this.api.request<ApiEnvelope<FinanceAccount[]>>("/finance/accounts"),
      this.api.request<ApiEnvelope<FinanceCategory[]>>("/finance/categories"),
      this.api.request<ApiEnvelope<FinanceTransaction[]>>(
        `/finance/transactions?date_from=${from}&date_to=${to}`,
      ),
      this.api.request<ApiEnvelope<FinanceOverview>>(
        `/finance/overview?month=${month}`,
      ),
      this.api.request<
        ApiEnvelope<{
          currency: string;
          mask_sensitive_data_by_default: boolean;
        }>
      >("/settings"),
    ]);

    return {
      accounts: accounts.data,
      categories: categories.data,
      transactions: transactions.data,
      overview: overview.data,
      currency: settings.data.currency,
      maskSensitiveData: settings.data.mask_sensitive_data_by_default,
    };
  }

  async createAccount(name: string, currency: string): Promise<FinanceAccount> {
    const response = await this.api.request<ApiEnvelope<FinanceAccount>>(
      "/finance/accounts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: "checking",
          currency,
          opening_balance: "0",
        }),
      },
    );

    return response.data;
  }

  async createCategory(
    name: string,
    type: "income" | "expense",
  ): Promise<FinanceCategory> {
    const response = await this.api.request<ApiEnvelope<FinanceCategory>>(
      "/finance/categories",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      },
    );

    return response.data;
  }

  async createTransaction(
    transaction: NewFinanceTransaction,
  ): Promise<FinanceTransaction> {
    const response = await this.api.request<ApiEnvelope<FinanceTransaction>>(
      "/finance/transactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      },
    );

    return response.data;
  }
}

function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}
