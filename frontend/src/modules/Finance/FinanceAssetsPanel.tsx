import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createFinanceAsset,
  createFinanceAssetValuation,
  getFinanceAssets,
  getFinanceAssetValuations,
  getFinanceNetWorth,
  updateFinanceAccount,
  updateFinanceAsset,
} from "./finance";
import type {
  FinanceAsset,
  FinanceAssetValuation,
  FinanceNetWorth,
} from "./finance";
import { getFinanceAccounts } from "./finance";
import type { FinanceAccount } from "./finance";

export function FinanceAssetsPanel() {
  const [assets, setAssets] = useState<FinanceAsset[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [netWorth, setNetWorth] = useState<FinanceNetWorth | null>(null);
  const [history, setHistory] = useState<
    Record<number, FinanceAssetValuation[]>
  >({});
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("investment");
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [costBasis, setCostBasis] = useState("");
  const [initialValue, setInitialValue] = useState("");
  const [valuationValue, setValuationValue] = useState("");
  const [valuationDate, setValuationDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [assetList, accountList, summary] = await Promise.all([
        getFinanceAssets(),
        getFinanceAccounts(),
        getFinanceNetWorth(),
      ]);
      const histories = await Promise.all(
        assetList.map(
          async (asset) =>
            [asset.id, await getFinanceAssetValuations(asset.id)] as const,
        ),
      );
      setAssets(assetList);
      setAccounts(accountList);
      setNetWorth(summary);
      setHistory(Object.fromEntries(histories));
      setError(null);
    } catch {
      setError("Assets and net worth could not be loaded.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  async function addAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createFinanceAsset({
        name: name.trim(),
        asset_type: assetType as
          | "investment"
          | "collectible"
          | "game_item"
          | "property"
          | "vehicle"
          | "other",
        account_id: accountId ? Number(accountId) : null,
        currency,
        cost_basis: costBasis || null,
        initial_value: initialValue,
        valued_at: valuationDate,
      });
      setName("");
      setCostBasis("");
      setInitialValue("");
      await reload();
    } catch {
      setError("The asset could not be saved. Check the values and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addValuation(assetId: number) {
    setBusy(true);
    setError(null);
    try {
      await createFinanceAssetValuation(assetId, {
        value: valuationValue,
        valued_at: valuationDate,
      });
      setValuationValue("");
      await reload();
    } catch {
      setError("The valuation could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAccount(accountId: number, selected: boolean) {
    setBusy(true);
    try {
      await updateFinanceAccount(accountId, !selected);
      await reload();
    } catch {
      setError("The account selection could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAsset(asset: FinanceAsset) {
    setBusy(true);
    try {
      await updateFinanceAsset(asset.id, {
        include_in_net_worth: !asset.include_in_net_worth,
      });
      await reload();
    } catch {
      setError("The asset selection could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveAsset(asset: FinanceAsset) {
    setBusy(true);
    try {
      await updateFinanceAsset(asset.id, { is_archived: true });
      await reload();
    } catch {
      setError("The asset could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8"
      aria-labelledby="assets-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            The whole picture
          </p>
          <h2 className="mt-1 text-2xl font-semibold" id="assets-title">
            Net worth & assets
          </h2>
        </div>
        <p className="max-w-xl text-sm text-stone-500 dark:text-stone-400">
          Values are grouped by currency; LifeOS does not invent exchange rates.
          When an included asset is linked to an account, that account balance
          is excluded to avoid double-counting.
        </p>
      </div>

      {error && (
        <p
          className="mt-4 text-sm text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <article className="rounded-2xl bg-stone-50 p-5 dark:bg-white/5">
          <h3 className="font-semibold">Net worth by currency</h3>
          {netWorth?.totals.length ? (
            <ul className="mt-3 space-y-2">
              {netWorth.totals.map((total) => (
                <li
                  className="flex justify-between gap-3 text-lg"
                  key={total.currency}
                >
                  <span>{total.currency}</span>
                  <span className="font-semibold">
                    {money(total.amount, total.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Select an account or add a valued asset to start your net-worth
              view.
            </p>
          )}

          <h4 className="mt-6 text-sm font-semibold">Accounts included</h4>
          {netWorth?.accounts.length ? (
            <ul className="mt-2 space-y-2">
              {netWorth.accounts.map((account) => (
                <li className="flex items-start gap-3 text-sm" key={account.id}>
                  <input
                    aria-label={`Include ${account.name} in net worth`}
                    checked={account.selected}
                    className="mt-1 size-4 accent-emerald-500"
                    disabled={busy}
                    onChange={() =>
                      void toggleAccount(account.id, account.selected)
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="font-medium">{account.name}</span>
                    <span className="ml-2 text-stone-500 dark:text-stone-400">
                      {money(account.balance, account.currency)}
                    </span>
                    {account.excluded_reason === "linked_asset" && (
                      <span className="block text-xs text-stone-500 dark:text-stone-400">
                        Excluded while linked asset values are included.
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              No accounts yet.
            </p>
          )}

          {netWorth?.asset_groups.length ? (
            <>
              <h4 className="mt-6 text-sm font-semibold">Asset groups</h4>
              <ul className="mt-2 space-y-1 text-sm text-stone-500 dark:text-stone-400">
                {netWorth.asset_groups.map((group) => (
                  <li key={`${group.asset_type}-${group.currency}`}>
                    {titleCase(group.asset_type)} · {group.asset_count} ·{" "}
                    {money(group.amount, group.currency)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </article>

        <form
          className="grid content-start gap-3 rounded-2xl bg-stone-50 p-5 dark:bg-white/5 sm:grid-cols-2"
          onSubmit={addAsset}
        >
          <h3 className="font-semibold sm:col-span-2">Add an asset</h3>
          <label className="text-sm font-medium sm:col-span-2">
            Name
            <input
              className={fieldClass}
              maxLength={120}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="e.g. Global index fund"
              required
              value={name}
            />
          </label>
          <label className="text-sm font-medium">
            Group
            <select
              className={fieldClass}
              onChange={(event) => setAssetType(event.currentTarget.value)}
              value={assetType}
            >
              <option value="investment">Investment</option>
              <option value="collectible">Collectible</option>
              <option value="game_item">Game item · CS2</option>
              <option value="property">Property</option>
              <option value="vehicle">Vehicle</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Currency
            <input
              className={fieldClass}
              maxLength={3}
              minLength={3}
              onChange={(event) => {
                const nextCurrency = event.currentTarget.value.toUpperCase();
                setCurrency(nextCurrency);
                if (
                  !accounts.some(
                    (account) =>
                      account.id === Number(accountId) &&
                      account.currency === nextCurrency,
                  )
                ) {
                  setAccountId("");
                }
              }}
              required
              value={currency}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Linked account (optional)
            <select
              className={fieldClass}
              onChange={(event) => setAccountId(event.currentTarget.value)}
              value={accountId}
            >
              <option value="">No linked account</option>
              {accounts
                .filter((account) => account.currency === currency)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Cost basis
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => setCostBasis(event.currentTarget.value)}
              placeholder="Optional"
              step="0.0001"
              type="number"
              value={costBasis}
            />
          </label>
          <label className="text-sm font-medium">
            Current value
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => setInitialValue(event.currentTarget.value)}
              required
              step="0.0001"
              type="number"
              value={initialValue}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Value date
            <input
              className={fieldClass}
              onChange={(event) => setValuationDate(event.currentTarget.value)}
              required
              type="date"
              value={valuationDate}
            />
          </label>
          <button
            className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
            disabled={busy}
            type="submit"
          >
            {busy ? "Saving…" : "Add asset"}
          </button>
        </form>
      </div>

      <div className="mt-7 space-y-4">
        <h3 className="text-lg font-semibold">Assets & valuation history</h3>
        {assets.length ? (
          assets.map((asset) => (
            <article
              className="rounded-2xl border border-stone-200 p-5 dark:border-white/10"
              key={asset.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{asset.name}</p>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {titleCase(asset.asset_type)}
                    {asset.account_name
                      ? ` · held in ${asset.account_name}`
                      : ""}{" "}
                    ·{" "}
                    {asset.source === "synced"
                      ? "Synced value"
                      : asset.source === "manual"
                        ? "Manual value"
                        : "Not valued yet"}
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {asset.current_value
                      ? money(asset.current_value, asset.currency)
                      : "No value recorded"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={asset.include_in_net_worth}
                      disabled={busy}
                      onChange={() => void toggleAsset(asset)}
                      type="checkbox"
                    />
                    Include in net worth
                  </label>
                  <button
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-white/15"
                    disabled={busy}
                    onClick={() => void archiveAsset(asset)}
                    type="button"
                  >
                    Archive
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 border-t border-stone-200 pt-4 dark:border-white/10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addValuation(asset.id);
                  }}
                >
                  <label className="min-w-32 flex-1 text-xs font-medium">
                    New valuation
                    <input
                      aria-label={`New value for ${asset.name}`}
                      className={fieldClass}
                      min="0"
                      onChange={(event) =>
                        setValuationValue(event.currentTarget.value)
                      }
                      required
                      step="0.0001"
                      type="number"
                      value={valuationValue}
                    />
                  </label>
                  <button
                    className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold dark:border-white/15"
                    disabled={busy}
                    type="submit"
                  >
                    Record value
                  </button>
                </form>
                <div>
                  <h4 className="text-sm font-semibold">History</h4>
                  {history[asset.id]?.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-stone-500 dark:text-stone-400">
                      {history[asset.id].slice(0, 5).map((valuation) => (
                        <li
                          className="flex flex-wrap justify-between gap-2"
                          key={valuation.id}
                        >
                          <span>
                            {dateLabel(valuation.valued_at)} ·{" "}
                            {valuation.source === "synced"
                              ? "Synced"
                              : "Manual"}
                          </span>
                          <span className="font-medium">
                            {money(valuation.value, asset.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                      No valuation history yet.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No assets yet. You can track investments, collectibles, game items,
            property, and more.
          </p>
        )}
      </div>
    </section>
  );
}

const fieldClass =
  "mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-normal dark:border-white/15 dark:bg-stone-950";
function today() {
  return new Date().toISOString().slice(0, 10);
}
function money(amount: string, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
function dateLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
