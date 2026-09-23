import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
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
      contentContainerClassName="mx-auto w-full max-w-[1120px] gap-3 px-5 pb-12 pt-8 md:px-9 md:pt-10"
    >
      <Text className="text-sm font-semibold text-lifeos-accent-dark">
        Your money, in context
      </Text>
      <Text className="text-[38px] font-bold tracking-[-0.7px] text-lifeos-primary">
        Finance
      </Text>
      <Text className="mb-2 text-[15px] leading-[22px] text-lifeos-muted">
        Your accounts and activity stay on your LifeOS server.
      </Text>

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading finance data"
          className="min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-sm text-lifeos-muted">
            Loading your finances…
          </Text>
        </View>
      ) : state.status === "error" ? (
        <View className="min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6">
          <Text className="text-center text-lg font-bold text-lifeos-primary">
            Finance data is unavailable
          </Text>
          <Text className="text-center text-sm leading-[21px] text-lifeos-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <ActionButton label="Try again" onPress={() => void reload()} />
        </View>
      ) : (
        <>
          <View className="flex-row items-center rounded-[18px] border border-lifeos-border bg-lifeos-surface p-3">
            <MonthNavigationButton
              direction="previous"
              onPress={() => setMonth((value) => shiftMonth(value, -1))}
            />
            <Text className="flex-1 text-center font-semibold text-lifeos-primary">
              {formatMonth(month)}
            </Text>
            <MonthNavigationButton
              direction="next"
              onPress={() => setMonth((value) => shiftMonth(value, 1))}
            />
          </View>

          {state.snapshot.accounts.length === 0 ? (
            <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
              <Text className="text-xl font-bold text-lifeos-primary">
                Create your first account
              </Text>
              <Text className="text-sm leading-[21px] text-lifeos-muted">
                Add a local account before recording transactions. Its currency
                comes from your LifeOS settings.
              </Text>
              <TextInput
                accessibilityLabel="Account name"
                className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
                maxLength={100}
                onChangeText={setAccountName}
                placeholder="e.g. Current account"
                placeholderTextColor="#758078"
                value={accountName}
              />
              <ActionButton
                disabled={saving || accountName.trim().length === 0}
                label={saving ? "Creating account…" : "Create account"}
                onPress={() => void addAccount()}
              />
            </View>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3">
                {state.snapshot.overview.totals.length === 0 ? (
                  <View className="min-h-[140px] flex-1 justify-center rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5">
                    <Text className="text-base font-bold text-lifeos-primary">
                      No cashflow recorded
                    </Text>
                    <Text className="mt-2 text-sm leading-[21px] text-lifeos-muted">
                      Add your first income or expense to see this month take
                      shape.
                    </Text>
                  </View>
                ) : (
                  state.snapshot.overview.totals.map((total) => (
                    <View
                      key={total.currency}
                      className="min-h-[140px] flex-1 justify-center rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5"
                    >
                      <Text className="text-sm text-lifeos-muted">
                        {total.currency} · monthly cashflow
                      </Text>
                      <Text className="mt-2 text-2xl font-bold text-lifeos-primary">
                        {money(
                          total.net_cashflow,
                          total.currency,
                          state.snapshot.maskSensitiveData,
                        )}
                      </Text>
                      <Text className="mt-2 text-sm text-lifeos-muted">
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

              <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
                <Text className="text-xl font-bold text-lifeos-primary">
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
                <Text className="text-sm font-semibold text-lifeos-primary">
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
                <Text className="text-sm font-semibold text-lifeos-primary">
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {state.snapshot.categories
                    .filter((category) => category.type === type && !category.is_archived)
                    .map((category) => (
                      <ActionButton
                        key={category.id}
                        label={category.name}
                        selected={selectedCategoryId === category.id}
                        onPress={() => setSelectedCategoryId(category.id)}
                      />
                    ))}
                  {state.snapshot.categories.filter(
                    (category) => category.type === type && !category.is_archived,
                  ).length === 0 ? (
                    <Text className="text-sm text-lifeos-muted">
                      No {type} categories yet.
                    </Text>
                  ) : null}
                </View>
                <TextInput
                  accessibilityLabel="Transaction amount"
                  className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
                  keyboardType="decimal-pad"
                  onChangeText={setAmount}
                  placeholder="Amount"
                  placeholderTextColor="#758078"
                  value={amount}
                />
                <TextInput
                  accessibilityLabel="Transaction description"
                  className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
                  maxLength={255}
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor="#758078"
                  value={description}
                />
                <TextInput
                  accessibilityLabel="Transaction date"
                  className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
                  onChangeText={setOccurredOn}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#758078"
                  value={occurredOn}
                />
                <ActionButton
                  disabled={
                    saving ||
                    selectedAccountId === null ||
                    amount.trim().length === 0
                  }
                  label={saving ? "Saving…" : "Save transaction"}
                  onPress={() => void saveTransaction()}
                />
              </View>

              <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
                <Text className="text-xl font-bold text-lifeos-primary">
                  Transactions
                </Text>
                {state.snapshot.transactions.length === 0 ? (
                  <Text className="text-sm leading-[21px] text-lifeos-muted">
                    No transactions for this month yet.
                  </Text>
                ) : (
                  state.snapshot.transactions.map((transaction) => (
                    <View
                      key={transaction.id}
                      className="flex-row items-center justify-between gap-4 border-t border-lifeos-border py-3"
                    >
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className="font-semibold text-lifeos-primary"
                        >
                          {transaction.description ||
                            (transaction.type === "income"
                              ? "Income"
                              : "Expense")}
                        </Text>
                        <Text className="mt-1 text-sm text-lifeos-muted">
                          {dateLabel(transaction.occurred_at)} ·{" "}
                          {accountNameFor(
                            transaction.account_id,
                            state.snapshot.accounts,
                          )}
                        </Text>
                      </View>
                      <Text
                        className={`font-bold ${transaction.type === "income" ? "text-lifeos-accent-dark" : "text-lifeos-primary"}`}
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

          <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-xl font-bold text-lifeos-primary">
              Accounts
            </Text>
            {state.snapshot.accounts.map((account) => (
              <View
                key={account.id}
                className="flex-row justify-between gap-4 border-t border-lifeos-border py-3"
              >
                <Text className="font-medium text-lifeos-primary">
                  {account.name}
                </Text>
                <Text className="font-semibold text-lifeos-primary">
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
              className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
              maxLength={100}
              onChangeText={setAccountName}
              placeholder="New account name"
              placeholderTextColor="#758078"
              value={accountName}
            />
            <ActionButton
              disabled={saving || accountName.trim().length === 0}
              label="Add account"
              onPress={() => void addAccount()}
            />
          </View>

          <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-xl font-bold text-lifeos-primary">
              Categories
            </Text>
            <Text className="text-sm leading-[21px] text-lifeos-muted">
              Create reusable income and expense categories for your transactions.
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
              className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
              maxLength={100}
              onChangeText={setCategoryName}
              placeholder="e.g. Groceries"
              placeholderTextColor="#758078"
              value={categoryName}
            />
            <ActionButton
              disabled={saving || categoryName.trim().length === 0}
              label={saving ? "Creating category…" : "Create category"}
              onPress={() => void addCategory()}
            />
          </View>
        </>
      )}

      {formError ? (
        <Text
          accessibilityRole="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
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
    <Pressable
      accessibilityLabel={isPrevious ? "Previous month" : "Next month"}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center rounded-xl border border-lifeos-border bg-lifeos-background active:opacity-70"
      onPress={onPress}
    >
      <Text
        className="text-2xl font-medium leading-[28px] text-lifeos-primary"
        accessible={false}
      >
        {isPrevious ? "‹" : "›"}
      </Text>
    </Pressable>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  selected = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      className={`min-h-11 justify-center rounded-xl px-4 ${selected ? "bg-lifeos-accent" : "border border-lifeos-border bg-lifeos-surface"} ${disabled ? "opacity-50" : "active:opacity-70"}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-semibold ${selected ? "text-lifeos-accent-ink" : "text-lifeos-primary"}`}
      >
        {label}
      </Text>
    </Pressable>
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
