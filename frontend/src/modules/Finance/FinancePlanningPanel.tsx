import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createFinanceBudget,
  createFinanceSavingsGoal,
  createFinanceSubscription,
  deleteFinanceBudget,
  deleteFinanceSavingsGoal,
  getFinanceBudgets,
  getFinanceSavingsGoals,
  getFinanceSubscriptions,
  updateFinanceSubscription,
} from "./finance";
import type {
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceSavingsGoal,
  FinanceSubscription,
} from "./finance";

type Props = {
  month: string;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
};

export function FinancePlanningPanel({ month, accounts, categories }: Props) {
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [subscriptions, setSubscriptions] = useState<FinanceSubscription[]>([]);
  const [goals, setGoals] = useState<FinanceSavingsGoal[]>([]);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const currencies = useMemo(
    () => [...new Set(accounts.map((account) => account.currency))],
    [accounts],
  );
  const expenseCategories = categories.filter(
    (category) => category.type === "expense",
  );

  const reload = useCallback(async () => {
    try {
      const [nextBudgets, nextSubscriptions, nextGoals] = await Promise.all([
        getFinanceBudgets(month),
        getFinanceSubscriptions(),
        getFinanceSavingsGoals(),
      ]);
      setBudgets(nextBudgets);
      setSubscriptions(nextSubscriptions);
      setGoals(nextGoals);
      setError(false);
    } catch {
      setError(true);
    }
  }, [month]);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      getFinanceBudgets(month),
      getFinanceSubscriptions(),
      getFinanceSavingsGoals(),
    ])
      .then(([nextBudgets, nextSubscriptions, nextGoals]) => {
        if (!isCurrent) return;
        setBudgets(nextBudgets);
        setSubscriptions(nextSubscriptions);
        setGoals(nextGoals);
        setError(false);
      })
      .catch(() => {
        if (isCurrent) setError(true);
      });
    return () => {
      isCurrent = false;
    };
  }, [month]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: (form: FormData) => Promise<unknown>,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    setSaving(true);
    setError(false);
    try {
      await action(values);
      formElement.reset();
      await reload();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const alerts = [
    ...budgets
      .filter((budget) => budget.is_over_budget)
      .map(
        (budget) =>
          `${budget.category_name} is over its ${budget.currency} budget by ${formatMoney(Math.abs(Number(budget.remaining)), budget.currency)}.`,
      ),
    ...subscriptions
      .filter(
        (subscription) =>
          subscription.status === "active" &&
          daysUntil(subscription.next_renewal_on) <= 7,
      )
      .map((subscription) => {
        const days = daysUntil(subscription.next_renewal_on);
        const timing =
          days < 0
            ? `${Math.abs(days)} days overdue`
            : days === 0
              ? "today"
              : `in ${days} days`;
        return `${subscription.name} renews ${timing} for ${formatMoney(Number(subscription.amount), subscription.currency)}.`;
      }),
    ...goals
      .filter((goal) => Number(goal.required_monthly_pace) > 0)
      .map(
        (goal) =>
          `Save ${formatMoney(Number(goal.required_monthly_pace), goal.currency)} per month for “${goal.name}”.`,
      ),
  ];

  return (
    <section
      aria-labelledby="planning-title"
      className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Plan ahead
          </p>
          <h2 className="mt-1 text-xl font-semibold" id="planning-title">
            Budgets, subscriptions & goals
          </h2>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Monthly budgets · upcoming renewals · savings pace
        </p>
      </div>
      {error && (
        <p
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          Planning data could not be saved or loaded. Please try again.
        </p>
      )}
      {alerts.length > 0 && (
        <div
          aria-label="Actionable finance reminders"
          className="mt-5 grid gap-2 sm:grid-cols-2"
        >
          {alerts.map((alert) => (
            <p
              className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
              key={alert}
            >
              {alert}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div>
          <h3 className="font-semibold">Monthly budgets</h3>
          <form
            className="mt-3 grid gap-2"
            onSubmit={(event) =>
              void submit(event, async (form) =>
                createFinanceBudget({
                  category_id: Number(form.get("category")),
                  month,
                  currency: String(form.get("currency")),
                  target_amount: String(form.get("target")),
                }),
              )
            }
          >
            <select
              aria-label="Budget category"
              className={fieldClass}
              name="category"
              required
            >
              <option value="">Expense category</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                aria-label="Budget currency"
                className={fieldClass}
                name="currency"
                required
              >
                {currencies.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
              <input
                aria-label="Budget target"
                className={fieldClass}
                min="0.01"
                name="target"
                placeholder="Monthly target"
                required
                step="0.01"
                type="number"
              />
            </div>
            <button
              className={primaryButtonClass}
              disabled={saving || expenseCategories.length === 0}
              type="submit"
            >
              Add budget for {month}
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {budgets.map((budget) => (
              <li
                className="rounded-xl bg-stone-50 p-3 dark:bg-white/5"
                key={budget.id}
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{budget.category_name}</span>
                  <span>
                    {budget.currency} {budget.spent} / {budget.target_amount}
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs ${budget.is_over_budget ? "text-rose-700 dark:text-rose-300" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {budget.is_over_budget
                    ? `Over by ${formatMoney(Math.abs(Number(budget.remaining)), budget.currency)}`
                    : `${formatMoney(Number(budget.remaining), budget.currency)} remaining`}
                </p>
                <button
                  className={textButtonClass}
                  onClick={() =>
                    void deleteFinanceBudget(budget.id)
                      .then(reload)
                      .catch(() => setError(true))
                  }
                  type="button"
                >
                  Remove budget
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Subscriptions</h3>
          <form
            className="mt-3 grid gap-2"
            onSubmit={(event) =>
              void submit(event, async (form) =>
                createFinanceSubscription({
                  account_id: Number(form.get("account")),
                  name: String(form.get("name")),
                  amount: String(form.get("amount")),
                  billing_cycle: String(form.get("cycle")) as
                    "monthly" | "quarterly" | "yearly",
                  next_renewal_on: String(form.get("renewal")),
                }),
              )
            }
          >
            <input
              aria-label="Subscription name"
              className={fieldClass}
              maxLength={120}
              name="name"
              placeholder="Name"
              required
            />
            <div className="flex gap-2">
              <input
                aria-label="Subscription amount"
                className={fieldClass}
                min="0.01"
                name="amount"
                placeholder="Amount"
                required
                step="0.01"
                type="number"
              />
              <select
                aria-label="Billing cycle"
                className={fieldClass}
                name="cycle"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <select
              aria-label="Subscription account"
              className={fieldClass}
              name="account"
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </select>
            <input
              aria-label="Next renewal date"
              className={fieldClass}
              name="renewal"
              required
              type="date"
            />
            <button
              className={primaryButtonClass}
              disabled={saving || accounts.length === 0}
              type="submit"
            >
              Add subscription
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {subscriptions.map((subscription) => (
              <li
                className="rounded-xl bg-stone-50 p-3 dark:bg-white/5"
                key={subscription.id}
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{subscription.name}</span>
                  <span>
                    {formatMoney(
                      Number(subscription.amount),
                      subscription.currency,
                    )}{" "}
                    · {subscription.billing_cycle}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Renews {subscription.next_renewal_on} · {subscription.status}
                </p>
                <div className="mt-2 flex gap-3">
                  {subscription.status !== "canceled" && (
                    <button
                      className={textButtonClass}
                      onClick={() =>
                        void updateFinanceSubscription(subscription.id, {
                          status:
                            subscription.status === "active"
                              ? "paused"
                              : "active",
                        })
                          .then(reload)
                          .catch(() => setError(true))
                      }
                      type="button"
                    >
                      {subscription.status === "active" ? "Pause" : "Resume"}
                    </button>
                  )}
                  {subscription.status !== "canceled" && (
                    <button
                      className={textButtonClass}
                      onClick={() =>
                        void updateFinanceSubscription(subscription.id, {
                          status: "canceled",
                        })
                          .then(reload)
                          .catch(() => setError(true))
                      }
                      type="button"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Savings goals</h3>
          <form
            className="mt-3 grid gap-2"
            onSubmit={(event) =>
              void submit(event, async (form) =>
                createFinanceSavingsGoal({
                  name: String(form.get("name")),
                  target_amount: String(form.get("target")),
                  current_amount: String(form.get("current") || "0"),
                  currency: String(form.get("currency")),
                  target_date: String(form.get("deadline")),
                }),
              )
            }
          >
            <input
              aria-label="Goal name"
              className={fieldClass}
              maxLength={120}
              name="name"
              placeholder="Goal name"
              required
            />
            <div className="flex gap-2">
              <input
                aria-label="Goal target amount"
                className={fieldClass}
                min="0.01"
                name="target"
                placeholder="Target"
                required
                step="0.01"
                type="number"
              />
              <input
                aria-label="Current savings"
                className={fieldClass}
                min="0"
                name="current"
                placeholder="Saved so far"
                step="0.01"
                type="number"
              />
            </div>
            <div className="flex gap-2">
              <select
                aria-label="Goal currency"
                className={fieldClass}
                name="currency"
                required
              >
                {currencies.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
              <input
                aria-label="Goal deadline"
                className={fieldClass}
                name="deadline"
                required
                type="date"
              />
            </div>
            <button
              className={primaryButtonClass}
              disabled={saving || currencies.length === 0}
              type="submit"
            >
              Add savings goal
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {goals.map((goal) => (
              <li
                className="rounded-xl bg-stone-50 p-3 dark:bg-white/5"
                key={goal.id}
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span>{goal.progress_percent}%</span>
                </div>
                <progress
                  aria-label={`${goal.name} progress`}
                  className="mt-2 h-2 w-full accent-emerald-600"
                  max="100"
                  value={goal.progress_percent}
                />
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {formatMoney(Number(goal.current_amount), goal.currency)} of{" "}
                  {formatMoney(Number(goal.target_amount), goal.currency)} ·{" "}
                  {formatMoney(
                    Number(goal.required_monthly_pace),
                    goal.currency,
                  )}
                  /month · due {goal.target_date}
                </p>
                <button
                  className={textButtonClass}
                  onClick={() =>
                    void deleteFinanceSavingsGoal(goal.id)
                      .then(reload)
                      .catch(() => setError(true))
                  }
                  type="button"
                >
                  Remove goal
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function daysUntil(date: string): number {
  return Math.ceil(
    (new Date(`${date}T00:00:00`).getTime() -
      new Date(new Date().toDateString()).getTime()) /
      86_400_000,
  );
}

const fieldClass =
  "min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-stone-950";
const primaryButtonClass =
  "rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-900";
const textButtonClass =
  "mt-2 text-xs font-semibold text-stone-600 underline underline-offset-2 dark:text-stone-300";
