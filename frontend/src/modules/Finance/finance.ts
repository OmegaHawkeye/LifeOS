import { apiClient } from "@/api/client";
import type { paths } from "@/api/schema";

export type FinanceAccount =
  paths["/finance/accounts"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type FinanceCategory =
  paths["/finance/categories"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type FinanceTransaction =
  paths["/finance/transactions"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type FinanceOverview =
  paths["/finance/overview"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type TransactionFilters = NonNullable<
  paths["/finance/transactions"]["get"]["parameters"]["query"]
>;
export type CreateTransaction =
  paths["/finance/transactions"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateTransaction =
  paths["/finance/transactions/{transaction}"]["patch"]["requestBody"]["content"]["application/json"];
export type FinanceBudget =
  paths["/finance/budgets"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type FinanceSubscription =
  paths["/finance/subscriptions"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type FinanceSavingsGoal =
  paths["/finance/savings-goals"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type CreateFinanceBudget =
  paths["/finance/budgets"]["post"]["requestBody"]["content"]["application/json"];
export type CreateFinanceSubscription =
  paths["/finance/subscriptions"]["post"]["requestBody"]["content"]["application/json"];
export type CreateFinanceSavingsGoal =
  paths["/finance/savings-goals"]["post"]["requestBody"]["content"]["application/json"];

export async function getFinanceAccounts(): Promise<FinanceAccount[]> {
  const { data, response } = await apiClient.GET("/finance/accounts");

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load your accounts.");
  }

  return data.data;
}

export async function getFinanceCategories(): Promise<FinanceCategory[]> {
  const { data, response } = await apiClient.GET("/finance/categories");

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load your categories.");
  }

  return data.data;
}

export async function getFinanceTransactions(
  filters: TransactionFilters,
): Promise<FinanceTransaction[]> {
  const { data, response } = await apiClient.GET("/finance/transactions", {
    params: { query: filters },
  });

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load your transactions.");
  }

  return data.data;
}

export async function getFinanceOverview(
  month: string,
  accountId?: number,
): Promise<FinanceOverview> {
  const { data, response } = await apiClient.GET("/finance/overview", {
    params: { query: { month, account_id: accountId } },
  });

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load your monthly overview.");
  }

  return data.data;
}

export async function createFinanceTransaction(
  transaction: CreateTransaction,
): Promise<FinanceTransaction> {
  const { data, response } = await apiClient.POST("/finance/transactions", {
    body: transaction,
  });

  if (!response.ok || !data) {
    throw new Error("LifeOS could not save your transaction.");
  }

  return data.data;
}

export async function updateFinanceTransaction(
  id: number,
  transaction: UpdateTransaction,
): Promise<FinanceTransaction> {
  const { data, response } = await apiClient.PATCH(
    "/finance/transactions/{transaction}",
    {
      params: { path: { transaction: id } },
      body: transaction,
    },
  );

  if (!response.ok || !data) {
    throw new Error("LifeOS could not update your transaction.");
  }

  return data.data;
}

export async function deleteFinanceTransaction(id: number): Promise<void> {
  const { response } = await apiClient.DELETE(
    "/finance/transactions/{transaction}",
    { params: { path: { transaction: id } } },
  );

  if (!response.ok) {
    throw new Error("LifeOS could not delete your transaction.");
  }
}

export async function getFinanceBudgets(
  month: string,
): Promise<FinanceBudget[]> {
  const { data, response } = await apiClient.GET("/finance/budgets", {
    params: { query: { month } },
  });
  if (!response.ok || !data) throw new Error("Could not load budgets.");
  return data.data;
}

export async function createFinanceBudget(
  budget: CreateFinanceBudget,
): Promise<FinanceBudget> {
  const { data, response } = await apiClient.POST("/finance/budgets", {
    body: budget,
  });
  if (!response.ok || !data) throw new Error("Could not save budget.");
  return data.data;
}

export async function deleteFinanceBudget(id: number): Promise<void> {
  const { response } = await apiClient.DELETE("/finance/budgets/{budget}", {
    params: { path: { budget: id } },
  });
  if (!response.ok) throw new Error("Could not delete budget.");
}

export async function getFinanceSubscriptions(): Promise<
  FinanceSubscription[]
> {
  const { data, response } = await apiClient.GET("/finance/subscriptions");
  if (!response.ok || !data) throw new Error("Could not load subscriptions.");
  return data.data;
}

export async function createFinanceSubscription(
  subscription: CreateFinanceSubscription,
): Promise<FinanceSubscription> {
  const { data, response } = await apiClient.POST("/finance/subscriptions", {
    body: subscription,
  });
  if (!response.ok || !data) throw new Error("Could not save subscription.");
  return data.data;
}

export async function updateFinanceSubscription(
  id: number,
  updates: paths["/finance/subscriptions/{subscription}"]["patch"]["requestBody"]["content"]["application/json"],
): Promise<FinanceSubscription> {
  const { data, response } = await apiClient.PATCH(
    "/finance/subscriptions/{subscription}",
    {
      params: { path: { subscription: id } },
      body: updates,
    },
  );
  if (!response.ok || !data) throw new Error("Could not update subscription.");
  return data.data;
}

export async function getFinanceSavingsGoals(): Promise<FinanceSavingsGoal[]> {
  const { data, response } = await apiClient.GET("/finance/savings-goals");
  if (!response.ok || !data) throw new Error("Could not load savings goals.");
  return data.data;
}

export async function createFinanceSavingsGoal(
  goal: CreateFinanceSavingsGoal,
): Promise<FinanceSavingsGoal> {
  const { data, response } = await apiClient.POST("/finance/savings-goals", {
    body: goal,
  });
  if (!response.ok || !data) throw new Error("Could not save savings goal.");
  return data.data;
}

export async function deleteFinanceSavingsGoal(id: number): Promise<void> {
  const { response } = await apiClient.DELETE("/finance/savings-goals/{goal}", {
    params: { path: { goal: id } },
  });
  if (!response.ok) throw new Error("Could not delete savings goal.");
}
