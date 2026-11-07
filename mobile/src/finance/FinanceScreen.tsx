import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@lifeos/ui/button";
import type {
  FinanceAccount,
  FinanceSnapshot,
  MobileFinanceService,
} from "./mobileFinanceService";

type FinanceScreenProps = {
  service: Pick<
    MobileFinanceService,
    "loadSnapshot" | "createAccount" | "createCategory" | "createTransaction"
  >;
};

type ScreenState =
  | { status: "loading" }
  | { status: "ready"; snapshot: FinanceSnapshot }
  | { status: "error" };

export function FinanceScreen({ service }: FinanceScreenProps) {
  const [month, setMonth] = useState(() => currentMonth());
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [accountName, setAccountName] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => currentDate());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const snapshot = await service.loadSnapshot(month);
      setState({ status: "ready", snapshot });
      setSelectedAccountId((selected) =>
        snapshot.accounts.some((account) => account.id === selected)
          ? selected
          : (snapshot.accounts[0]?.id ?? null),
      );
      setSelectedCategoryId((selected) =>
        snapshot.categories.some(
          (category) => category.id === selected && category.type === type,
        )
          ? selected
          : (snapshot.categories.find((category) => category.type === type)
              ?.id ?? null),
      );
    } catch {
      setState({ status: "error" });
    }
  }, [month, service, type]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addAccount() {
    if (state.status !== "ready" || accountName.trim().length === 0) {
      setFormError("Enter an account name to continue.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const account = await service.createAccount(
        accountName.trim(),
        state.snapshot.currency,
      );
      setAccountName("");
      setSelectedAccountId(account.id);
      await reload();
    } catch {
      setFormError(
        "The account could not be saved. Check your server and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTransaction() {
    const parsedAmount = Number(amount.trim().replace(",", "."));
    if (
      selectedAccountId === null ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !isCalendarDate(occurredOn)
    ) {
      setFormError("Choose an account and enter a valid amount and date.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await service.createTransaction({
        account_id: selectedAccountId,
        category_id: selectedCategoryId,
        type,
        amount: parsedAmount.toFixed(2),
        occurred_at: `${occurredOn}T12:00:00.000Z`,
        description: description.trim() || null,
      });
      setAmount("");
      setDescription("");
      await reload();
    } catch {
      setFormError(
        "The transaction could not be saved. Check your server and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    if (state.status !== "ready" || categoryName.trim().length === 0) {
      setFormError("Enter a category name to continue.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const category = await service.createCategory(categoryName.trim(), type);
      setCategoryName("");
      setSelectedCategoryId(category.id);
      await reload();
    } catch {
      setFormError(
        "The category could not be saved. Check your server and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-content gap-3 px-4 pb-10 pt-6 tablet:px-6 tablet:pt-8 desktop:px-8"
    >
      <Text className="text-overline uppercase text-ink-muted">
        Your money, in context
      </Text>
      <Text
        accessibilityRole="header"
        className="text-display-m text-ink tablet:text-display-l"
      >
        Finance
      </Text>
      <Text className="mb-2 text-body text-ink-muted">
        Your accounts and activity stay on your LifeOS server.
      </Text>

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading finance data"
          className="min-h-[180px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-body-s text-ink-muted">
            Loading your finances…
          </Text>
        </View>
      ) : state.status === "error" ? (
        <View className="min-h-[180px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6">
          <Text className="text-center text-title-m font-semibold text-ink">
            Finance data is unavailable
          </Text>
          <Text className="text-center text-body-s text-ink-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <ActionButton label="Try again" onPress={() => void reload()} />
        </View>
      ) : (
        <>
          <View className="flex-row items-center rounded-md border border-line bg-surface p-3">
            <MonthNavigationButton
              direction="previous"
              onPress={() => setMonth((value) => shiftMonth(value, -1))}
            />
            <Text className="flex-1 text-center font-semibold text-ink">
              {formatMonth(month)}
            </Text>
            <MonthNavigationButton
              direction="next"
              onPress={() => setMonth((value) => shiftMonth(value, 1))}
            />
          </View>

          {state.snapshot.accounts.length === 0 ? (
            <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
              <Text className="text-title-l font-semibold text-ink">
                Create your first account
              </Text>
              <Text className="text-body-s text-ink-muted">
                Add a local account before recording transactions. Its currency
                comes from your LifeOS settings.
              </Text>
              <TextInput
                accessibilityLabel="Account name"
                className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
                maxLength={100}
                onChangeText={setAccountName}
                placeholder="e.g. Current account"
                placeholderTextColorClassName="accent-ink-muted"
                value={accountName}
              />
              <ActionButton
                disabled={saving || accountName.trim().length === 0}
                loading={saving}
                label={saving ? "Creating account…" : "Create account"}
                onPress={() => void addAccount()}
              />
            </View>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3">
                {state.snapshot.overview.totals.length === 0 ? (
                  <View className="min-h-[140px] flex-1 justify-center rounded-md border border-line bg-surface p-5">
                    <Text className="text-body font-semibold text-ink">
                      No cashflow recorded
                    </Text>
                    <Text className="mt-2 text-body-s text-ink-muted">
                      Add your first income or expense to see this month take
                      shape.
                    </Text>
                  </View>
                ) : (
                  state.snapshot.overview.totals.map((total) => (
                    <View
                      key={total.currency}
                      className="min-h-[140px] flex-1 justify-center rounded-md border border-line bg-surface p-5"
                    >
                      <Text className="text-body-s text-ink-muted">
                        {total.currency} · monthly cashflow
                      </Text>
                      <Text className="mt-2 text-figure-l font-semibold text-ink">
                        {money(
                          total.net_cashflow,
                          total.currency,
                          state.snapshot.maskSensitiveData,
                        )}
                      </Text>
                      <Text className="mt-2 text-body-s text-ink-muted">
                        In{" "}
                        {money(
                          total.income,
                          total.currency,
                          state.snapshot.maskSensitiveData,
                        )}{" "}
                        · Out{" "}
                        {money(
                          total.spending,
                          total.currency,
                          state.snapshot.maskSensitiveData,
                        )}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
                <Text className="text-title-l font-semibold text-ink">
                  Record a transaction
                </Text>
                <View className="flex-row gap-2">
                  <ActionButton
                    label="Expense"
                    selected={type === "expense"}
                    onPress={() => setType("expense")}
                  />
                  <ActionButton
                    label="Income"
                    selected={type === "income"}
                    onPress={() => setType("income")}
                  />
                </View>
                <Text className="text-body-s font-semibold text-ink">
                  Account
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {state.snapshot.accounts.map((account) => (
                    <ActionButton
                      key={account.id}
                      label={account.name}
                      selected={selectedAccountId === account.id}
                      onPress={() => setSelectedAccountId(account.id)}
                    />
                  ))}
                </View>
                <Text className="text-body-s font-semibold text-ink">
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {state.snapshot.categories
                    .filter(
                      (category) =>
                        category.type === type && !category.is_archived,
                    )
                    .map((category) => (
                      <ActionButton
                        key={category.id}
                        label={category.name}
                        selected={selectedCategoryId === category.id}
                        onPress={() => setSelectedCategoryId(category.id)}
                      />
                    ))}
                  {state.snapshot.categories.filter(
                    (category) =>
                      category.type === type && !category.is_archived,
                  ).length === 0 ? (
                    <Text className="text-body-s text-ink-muted">
                      No {type} categories yet.
                    </Text>
                  ) : null}
                </View>
                <TextInput
                  accessibilityLabel="Transaction amount"
                  className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
                  keyboardType="decimal-pad"
                  onChangeText={setAmount}
                  placeholder="Amount"
                  placeholderTextColorClassName="accent-ink-muted"
                  value={amount}
                />
                <TextInput
                  accessibilityLabel="Transaction description"
                  className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
                  maxLength={255}
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColorClassName="accent-ink-muted"
                  value={description}
                />
                <TextInput
                  accessibilityLabel="Transaction date"
                  className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
                  onChangeText={setOccurredOn}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColorClassName="accent-ink-muted"
                  value={occurredOn}
                />
                <ActionButton
                  disabled={
                    saving ||
                    selectedAccountId === null ||
                    !isValidTransactionAmount(amount) ||
                    !isCalendarDate(occurredOn)
                  }
                  loading={saving}
                  label={saving ? "Saving…" : "Save transaction"}
                  onPress={() => void saveTransaction()}
                />
              </View>

              <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
                <Text className="text-title-l font-semibold text-ink">
                  Transactions
                </Text>
                {state.snapshot.transactions.length === 0 ? (
                  <Text className="text-body-s text-ink-muted">
                    No transactions for this month yet.
                  </Text>
                ) : (
                  state.snapshot.transactions.map((transaction) => (
                    <View
                      key={transaction.id}
                      className="flex-row items-center justify-between gap-4 border-t border-line py-3"
                    >
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className="font-semibold text-ink"
                        >
                          {transaction.description ||
                            (transaction.type === "income"
                              ? "Income"
                              : "Expense")}
                        </Text>
                        <Text className="mt-1 text-body-s text-ink-muted">
                          {dateLabel(transaction.occurred_at)} ·{" "}
                          {accountNameFor(
                            transaction.account_id,
                            state.snapshot.accounts,
                          )}
                        </Text>
                      </View>
                      <Text
                        className={`font-semibold ${transaction.type === "income" ? "text-primary-text" : "text-ink"}`}
                      >
                        {transaction.type === "income" ? "+" : "−"}
                        {money(
                          transaction.amount,
                          transaction.currency,
                          state.snapshot.maskSensitiveData,
                        )}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
            <Text className="text-title-l font-semibold text-ink">
              Accounts
            </Text>
            {state.snapshot.accounts.map((account) => (
              <View
                key={account.id}
                className="flex-row justify-between gap-4 border-t border-line py-3"
              >
                <Text className="font-medium text-ink">{account.name}</Text>
                <Text className="font-semibold text-ink">
                  {money(
                    account.balance,
                    account.currency,
                    state.snapshot.maskSensitiveData,
                  )}
                </Text>
              </View>
            ))}
            <TextInput
              accessibilityLabel="Account name"
              className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
              maxLength={100}
              onChangeText={setAccountName}
              placeholder="New account name"
              placeholderTextColorClassName="accent-ink-muted"
              value={accountName}
            />
            <ActionButton
              disabled={saving || accountName.trim().length === 0}
              loading={saving}
              label="Add account"
              onPress={() => void addAccount()}
            />
          </View>

          <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
            <Text className="text-title-l font-semibold text-ink">
              Categories
            </Text>
            <Text className="text-body-s text-ink-muted">
              Create reusable income and expense categories for your
              transactions.
            </Text>
            <View className="flex-row gap-2">
              <ActionButton
                label="Expense"
                selected={type === "expense"}
                onPress={() => setType("expense")}
              />
              <ActionButton
                label="Income"
                selected={type === "income"}
                onPress={() => setType("income")}
              />
            </View>
            <TextInput
              accessibilityLabel="Category name"
              className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
              maxLength={100}
              onChangeText={setCategoryName}
              placeholder="e.g. Groceries"
              placeholderTextColorClassName="accent-ink-muted"
              value={categoryName}
            />
            <ActionButton
              disabled={saving || categoryName.trim().length === 0}
              loading={saving}
              label={saving ? "Creating category…" : "Create category"}
              onPress={() => void addCategory()}
            />
          </View>
        </>
      )}

      {formError ? (
        <Text
          accessibilityRole="alert"
          className="rounded-sm bg-danger-soft p-4 text-body-s text-danger"
        >
          {formError}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function MonthNavigationButton({
  direction,
  onPress,
}: {
  direction: "previous" | "next";
  onPress: () => void;
}) {
  const isPrevious = direction === "previous";

  return (
    <Button
      accessibilityLabel={isPrevious ? "Previous month" : "Next month"}
      className="h-11 w-11 p-0"
      onPress={onPress}
      variant="icon"
    >
      <Text className="text-figure-l font-medium text-ink" accessible={false}>
        {isPrevious ? "‹" : "›"}
      </Text>
    </Button>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  loading = false,
  selected = false,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Button
      className="flex-1"
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      selected={selected}
      variant={selected ? "primary" : "secondary"}
    >
      {label}
    </Button>
  );
}

function currentMonth(): string {
  return currentDate().slice(0, 7);
}

function currentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function money(amount: string, currency: string, masked: boolean): string {
  if (masked) return "••••";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

function isValidTransactionAmount(value: string): boolean {
  const parsed = Number(value.trim().replace(",", "."));
  return value.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function accountNameFor(id: number, accounts: FinanceAccount[]): string {
  return accounts.find((account) => account.id === id)?.name ?? "Account";
}
