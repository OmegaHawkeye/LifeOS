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
