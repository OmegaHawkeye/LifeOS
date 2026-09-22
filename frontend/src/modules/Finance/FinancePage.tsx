import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createFinanceTransaction,
  createFinanceAccount,
  deleteFinanceTransaction,
  getFinanceAccounts,
  getFinanceCategories,
  getFinanceOverview,
  getFinanceTransactions,
  updateFinanceTransaction,
} from "./finance";
import type {
  CreateTransaction,
  FinanceAccount,
  FinanceCategory,
  FinanceOverview,
  FinanceTransaction,
  TransactionFilters,
  UpdateTransaction,
} from "./finance";
import { FinancePlanningPanel } from "./FinancePlanningPanel";
import { FinanceAssetsPanel } from "./FinanceAssetsPanel";

type TransactionType = "income" | "expense";
type FormValues = {
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  occurredOn: string;
  payee: string;
  description: string;
  tags: string;
};
type Filters = {
  accountId: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  tag: string;
  search: string;
};

const emptyFilters: Filters = {
  accountId: "",
  categoryId: "",
  dateFrom: "",
  dateTo: "",
  tag: "",
  search: "",
};

export function FinancePage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [form, setForm] = useState<FormValues>(initialForm());
  const [editingTransaction, setEditingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountCurrency, setAccountCurrency] = useState("EUR");
  const [accountSaving, setAccountSaving] = useState(false);

  const apiFilters = useMemo<TransactionFilters>(
    () => ({
      ...(filters.accountId ? { account_id: Number(filters.accountId) } : {}),
      ...(filters.categoryId
        ? { category_id: Number(filters.categoryId) }
        : {}),
      ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
      ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
      ...(filters.tag.trim() ? { tag: filters.tag.trim() } : {}),
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    }),
    [filters],
  );

  useEffect(() => {
    Promise.all([getFinanceAccounts(), getFinanceCategories()])
      .then(([ownerAccounts, ownerCategories]) => {
        setAccounts(ownerAccounts);
        setCategories(ownerCategories);
        setForm((current) => ({
          ...current,
          accountId: current.accountId || String(ownerAccounts[0]?.id ?? ""),
        }));
      })
      .catch(() => setLoadError(true));
  }, []);

  const fetchFinanceData = useCallback(() => {
    return Promise.all([
      getFinanceTransactions(apiFilters),
      getFinanceOverview(
        month,
        filters.accountId ? Number(filters.accountId) : undefined,
      ),
    ]);
  }, [apiFilters, filters.accountId, month]);

  const reloadFinance = useCallback(async () => {
    try {
      const [ownerTransactions, monthlyOverview] = await fetchFinanceData();
      setLoadError(false);
      setTransactions(ownerTransactions);
      setOverview(monthlyOverview);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFinanceData]);

  useEffect(() => {
    let isCurrent = true;

    fetchFinanceData()
      .then(([ownerTransactions, monthlyOverview]) => {
        if (!isCurrent) {
          return;
        }

        setLoadError(false);
        setTransactions(ownerTransactions);
        setOverview(monthlyOverview);
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [fetchFinanceData]);

  const availableCategories = categories.filter(
    (category) => category.type === form.type,
  );

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingTransaction(null);
    setSaveError(false);
    setForm({ ...initialForm(), accountId: String(accounts[0]?.id ?? "") });
  }

  function startEditing(transaction: FinanceTransaction) {
    setEditingTransaction(transaction);
    setSaveError(false);
    setForm({
      accountId: String(transaction.account_id),
      categoryId: transaction.category ? String(transaction.category.id) : "",
      type: transaction.type,
      amount: transaction.amount,
      occurredOn: transaction.occurred_at.slice(0, 10),
      payee: transaction.payee ?? "",
      description: transaction.description ?? "",
      tags: transaction.tags.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(false);

    const commonValues = {
      account_id: Number(form.accountId),
      category_id: form.categoryId ? Number(form.categoryId) : null,
      type: form.type,
      amount: form.amount,
      description: form.description.trim() || null,
      occurred_at: `${form.occurredOn}T12:00:00.000Z`,
      payee: form.payee.trim() || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    } satisfies CreateTransaction;

    try {
      if (editingTransaction) {
        const values: UpdateTransaction = commonValues;
        await updateFinanceTransaction(editingTransaction.id, values);
      } else {
        await createFinanceTransaction(commonValues);
      }

      resetForm();
      await reloadFinance();
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTransaction(transaction: FinanceTransaction) {
    const label =
      transaction.description || transaction.payee || "this transaction";

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      return;
    }

    setSaveError(false);

    try {
      await deleteFinanceTransaction(transaction.id);
      await reloadFinance();
    } catch {
      setSaveError(true);
    }
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSaving(true);
    try {
      const account = await createFinanceAccount({
        name: accountName.trim(),
        type: "checking",
        currency: accountCurrency,
        opening_balance: "0",
      });
      setAccounts((current) => [...current, account]);
      setAccountName("");
    } finally {
      setAccountSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto w-full max-w-[1400px] pr-1 lg:pr-8 2xl:pr-14"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Your money, in context
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
            id="page-title"
          >
            Finance
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">
            Record a transaction in seconds and see how this month is shaping
            up.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1 dark:border-white/10 dark:bg-stone-900">
          <button
            aria-label="Previous month"
            className={iconButtonClass}
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            type="button"
          >
            ‹
          </button>
          <label className="sr-only" htmlFor="overview-month">
            Overview month
          </label>
          <input
            className="w-36 border-0 bg-transparent px-1 py-2 text-center text-sm font-medium outline-none"
            id="overview-month"
            onChange={(event) => setMonth(event.currentTarget.value)}
            type="month"
            value={month}
          />
          <button
            aria-label="Next month"
            className={iconButtonClass}
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      {loadError && (
        <div
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          <span>
            Finance data could not be loaded. Check your connection and try
            again.
          </span>
          <button
            className="font-semibold underline"
            onClick={() => void reloadFinance()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {accounts.length === 0 && (
        <form
          className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-950/20 sm:p-7"
          onSubmit={addAccount}
        >
          <h2 className="text-lg font-semibold">
            Set up your first finance account
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            An account provides the currency needed for budgets and
            transactions.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
            <input
              aria-label="Account name"
              className={fieldClass}
              onChange={(event) => setAccountName(event.currentTarget.value)}
              placeholder="e.g. Main account"
              required
              value={accountName}
            />
            <select
              aria-label="Account currency"
              className={fieldClass}
              onChange={(event) =>
                setAccountCurrency(event.currentTarget.value)
              }
              value={accountCurrency}
            >
              <option>EUR</option>
              <option>USD</option>
              <option>CHF</option>
              <option>GBP</option>
            </select>
            <button
              className={primaryButtonClass}
              disabled={accountSaving}
              type="submit"
            >
              {accountSaving ? "Adding…" : "Add account"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview?.totals.length ? (
            overview.totals.map((total) => (
              <div
                className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-6"
                key={total.currency}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                  {total.currency} · income
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {formatCurrency(total.income, total.currency)}
                </p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                  Spending
                </p>
                <p className="mt-2 text-lg font-medium">
                  {formatCurrency(total.spending, total.currency)}
                </p>
                <div className="mt-4 border-t border-stone-100 pt-4 dark:border-white/10">
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    Net cashflow
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold ${Number(total.net_cashflow) < 0 ? "text-orange-700 dark:text-orange-300" : "text-emerald-700 dark:text-emerald-300"}`}
                  >
                    {formatCurrency(total.net_cashflow, total.currency)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-6 text-sm leading-6 text-stone-500 dark:border-white/15 dark:bg-stone-900/60 dark:text-stone-400 sm:col-span-2 lg:col-span-3">
              No cashflow recorded for this month yet. Add your first
              transaction below to start your overview.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Category breakdown</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Monthly activity by category
              </p>
            </div>
            <span
              aria-hidden="true"
              className="text-lg text-emerald-600 dark:text-emerald-300"
            >
              ◌
            </span>
          </div>
          {overview?.category_breakdown.length ? (
            <ul className="mt-5 space-y-4">
              {overview.category_breakdown.map((item) => (
                <li
                  key={`${item.category_id ?? "none"}-${item.type}-${item.currency}`}
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      {item.category_name}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatCurrency(item.total, item.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span className="capitalize">{item.type}</span>
                    <span>
                      {item.transaction_count}{" "}
                      {item.transaction_count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Your categories will appear here as you record income and
              spending.
            </p>
          )}
        </div>
      </div>

      <FinancePlanningPanel
        month={month}
        accounts={accounts}
        categories={categories}
        onCategoryCreated={(category) =>
          setCategories((current) => [...current, category])
        }
      />

      <FinanceAssetsPanel />

      <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {editingTransaction ? "Update a record" : "Quick entry"}
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {editingTransaction ? "Edit transaction" : "Add a transaction"}
            </h2>
          </div>
          {editingTransaction && (
            <button
              className={quietButtonClass}
              onClick={resetForm}
              type="button"
            >
              Cancel edit
            </button>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-stone-100 p-4 text-sm leading-6 text-stone-600 dark:bg-white/5 dark:text-stone-300">
            Create an account before adding transactions. Your account keeps
            every balance and currency in one place.
          </p>
        ) : (
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            onSubmit={saveTransaction}
          >
            <label className="text-sm font-medium" htmlFor="transaction-type">
              Type
              <select
                className={fieldClass}
                id="transaction-type"
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.currentTarget.value as TransactionType,
                    categoryId: "",
                  })
                }
                value={form.type}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label className="text-sm font-medium" htmlFor="transaction-amount">
              Amount
              <input
                className={fieldClass}
                id="transaction-amount"
                inputMode="decimal"
                min="0.01"
                onChange={(event) =>
                  setForm({ ...form, amount: event.currentTarget.value })
                }
                placeholder="0.00"
                required
                step="0.0001"
                type="number"
                value={form.amount}
              />
            </label>
            <label
              className="text-sm font-medium"
              htmlFor="transaction-account"
            >
              Account
              <select
                className={fieldClass}
                id="transaction-account"
                onChange={(event) =>
                  setForm({ ...form, accountId: event.currentTarget.value })
                }
                required
                value={form.accountId}
              >
                <option value="">Choose account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="text-sm font-medium"
              htmlFor="transaction-category"
            >
              Category{" "}
              <span className="font-normal text-stone-400">(optional)</span>
              <select
                className={fieldClass}
                id="transaction-category"
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.currentTarget.value })
                }
                value={form.categoryId}
              >
                <option value="">Uncategorized</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium" htmlFor="transaction-date">
              Date
              <input
                className={fieldClass}
                id="transaction-date"
                onChange={(event) =>
                  setForm({ ...form, occurredOn: event.currentTarget.value })
                }
                required
                type="date"
                value={form.occurredOn}
              />
            </label>
            <label className="text-sm font-medium" htmlFor="transaction-payee">
              Payee{" "}
              <span className="font-normal text-stone-400">(optional)</span>
              <input
                className={fieldClass}
                id="transaction-payee"
                onChange={(event) =>
                  setForm({ ...form, payee: event.currentTarget.value })
                }
                placeholder="Who was it for?"
                value={form.payee}
              />
            </label>
            <label
              className="text-sm font-medium"
              htmlFor="transaction-description"
            >
              Note{" "}
              <span className="font-normal text-stone-400">(optional)</span>
              <input
                className={fieldClass}
                id="transaction-description"
                onChange={(event) =>
                  setForm({ ...form, description: event.currentTarget.value })
                }
                placeholder="What was it?"
                value={form.description}
              />
            </label>
            <label className="text-sm font-medium" htmlFor="transaction-tags">
              Tags{" "}
              <span className="font-normal text-stone-400">
                (comma separated)
              </span>
              <input
                className={fieldClass}
                id="transaction-tags"
                onChange={(event) =>
                  setForm({ ...form, tags: event.currentTarget.value })
                }
                placeholder="home, recurring"
                value={form.tags}
              />
            </label>
            {saveError && (
              <p
                className="text-sm text-red-700 dark:text-red-300 sm:col-span-2 xl:col-span-4"
                role="alert"
              >
                The transaction could not be saved. Check the values and try
                again.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
              <button
                className={primaryButtonClass}
                disabled={isSaving}
                type="submit"
              >
                {isSaving
                  ? "Saving…"
                  : editingTransaction
                    ? "Save changes"
                    : "Add transaction"}
              </button>
              {!editingTransaction && (
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {form.accountId
                    ? accounts.find(
                        (account) => String(account.id) === form.accountId,
                      )?.currency
                    : ""}
                  {form.accountId
                    ? " account currency"
                    : "Choose an account to set the currency"}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Transactions</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {transactions.length}{" "}
              {transactions.length === 1 ? "record" : "records"} matching your
              filters
            </p>
          </div>
          <button
            className={quietButtonClass}
            onClick={() => setFilters(emptyFilters)}
            type="button"
          >
            Clear filters
          </button>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-stone-900 sm:grid-cols-2 xl:grid-cols-6">
          <label
            className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            htmlFor="filter-account"
          >
            Account
            <select
              className={filterClass}
              id="filter-account"
              onChange={(event) =>
                updateFilter("accountId", event.currentTarget.value)
              }
              value={filters.accountId}
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label
            className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            htmlFor="filter-category"
          >
            Category
            <select
              className={filterClass}
              id="filter-category"
              onChange={(event) =>
                updateFilter("categoryId", event.currentTarget.value)
              }
              value={filters.categoryId}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label
            className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            htmlFor="filter-from"
          >
            From
            <input
              className={filterClass}
              id="filter-from"
              onChange={(event) =>
                updateFilter("dateFrom", event.currentTarget.value)
              }
              type="date"
              value={filters.dateFrom}
            />
          </label>
          <label
            className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            htmlFor="filter-to"
          >
            To
            <input
              className={filterClass}
              id="filter-to"
              onChange={(event) =>
                updateFilter("dateTo", event.currentTarget.value)
              }
              type="date"
              value={filters.dateTo}
            />
          </label>
          <label
            className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            htmlFor="filter-tag"
          >
            Tag
            <input
              className={filterClass}
              id="filter-tag"
              onChange={(event) =>
                updateFilter("tag", event.currentTarget.value)
              }
              placeholder="e.g. home"
              value={filters.tag}
            />
          </label>
          <label
            className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            htmlFor="filter-search"
          >
            Search
            <input
              className={filterClass}
              id="filter-search"
              onChange={(event) =>
                updateFilter("search", event.currentTarget.value)
              }
              placeholder="Payee, note, or tag"
              value={filters.search}
            />
          </label>
        </div>

        {isLoading ? (
          <p
            aria-live="polite"
            className="py-10 text-center text-sm text-stone-500 dark:text-stone-400"
          >
            Loading your transactions…
          </p>
        ) : transactions.length ? (
          <ul className="mt-4 divide-y divide-stone-200 overflow-hidden rounded-3xl border border-stone-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-stone-900">
            {transactions.map((transaction) => (
              <TransactionRow
                accounts={accounts}
                key={transaction.id}
                onDelete={() => void deleteTransaction(transaction)}
                onEdit={() => startEditing(transaction)}
                transaction={transaction}
              />
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-10 text-center dark:border-white/15 dark:bg-stone-900/60">
            <p className="font-medium">No transactions found</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {Object.values(filters).some(Boolean)
                ? "Try adjusting your filters or clear them to see everything."
                : "Your first entry is ready to add above."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function TransactionRow({
  accounts,
  onDelete,
  onEdit,
  transaction,
}: {
  accounts: FinanceAccount[];
  onDelete: () => void;
  onEdit: () => void;
  transaction: FinanceTransaction;
}) {
  const account = accounts.find((item) => item.id === transaction.account_id);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
      <span
        aria-hidden="true"
        className={`grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-semibold ${transaction.type === "income" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200" : "bg-orange-100 text-orange-800 dark:bg-orange-300/10 dark:text-orange-200"}`}
      >
        {transaction.type === "income" ? "↙" : "↗"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {transaction.description ||
            transaction.payee ||
            (transaction.type === "income" ? "Income" : "Expense")}
        </p>
        <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
          {[
            transaction.payee,
            transaction.category?.name,
            account?.name,
            formatDate(transaction.occurred_at),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {transaction.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {transaction.tags.map((tag) => (
              <span
                className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600 dark:bg-white/5 dark:text-stone-300"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.type === "income" ? "text-emerald-700 dark:text-emerald-300" : "text-stone-800 dark:text-stone-100"}`}
      >
        {transaction.type === "income" ? "+" : "−"}
        {formatCurrency(transaction.amount, transaction.currency)}
      </p>
      <div className="flex shrink-0 gap-1">
        <button
          aria-label={`Edit ${transaction.description || "transaction"}`}
          className={iconButtonClass}
          onClick={onEdit}
          type="button"
        >
          ✎
        </button>
        <button
          aria-label={`Delete ${transaction.description || "transaction"}`}
          className={iconButtonClass}
          onClick={onDelete}
          type="button"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function currentMonth(): string {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function initialForm(): FormValues {
  return {
    accountId: "",
    categoryId: "",
    type: "expense",
    amount: "",
    occurredOn: localDate(new Date()),
    payee: "",
    description: "",
    tags: "",
  };
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(date));
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-stone-950";
const filterClass =
  "mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm font-normal text-stone-800 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-stone-950 dark:text-stone-100";
const primaryButtonClass =
  "rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60";
const quietButtonClass =
  "rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10";
const iconButtonClass =
  "grid size-9 shrink-0 place-items-center rounded-lg text-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-950 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white";
