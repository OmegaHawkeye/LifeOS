<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAsset;
use Illuminate\Support\Facades\DB;

class GetFinanceNetWorth
{
    /** @return array<string, mixed> */
    public function forOwner(int|string $ownerId): array
    {
        $accounts = $this->accounts->forOwner($ownerId);
        $assets = FinanceAsset::query()
            ->with('account:id,name,currency')
            ->where('owner_id', $ownerId)
            ->whereNull('archived_at')
            ->orderBy('asset_type')
            ->orderBy('name')
            ->get();

        $linkedAccountIds = $assets
            ->filter(fn (FinanceAsset $asset): bool => $asset->include_in_net_worth
                && $asset->current_value !== null
                && $asset->account?->currency === $asset->currency)
            ->pluck('account_id')
            ->filter()
            ->unique()
            ->values();

        $accountRows = $accounts->map(function ($account) use ($linkedAccountIds): array {
            $doubleCounted = $linkedAccountIds->contains($account->id);
            $included = $account->include_in_net_worth && ! $doubleCounted;

            return [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'currency' => $account->currency,
                'balance' => $account->balance,
                'selected' => $account->include_in_net_worth,
                'included' => $included,
                'excluded_reason' => $doubleCounted ? 'linked_asset' : (! $account->include_in_net_worth ? 'not_selected' : null),
            ];
        });

        $assetRows = $assets->map(fn (FinanceAsset $asset): array => [
            'id' => $asset->id,
            'name' => $asset->name,
            'asset_type' => $asset->asset_type,
            'account_id' => $asset->account_id,
            'account_name' => $asset->account?->name,
            'currency' => $asset->currency,
            'cost_basis' => $asset->cost_basis,
            'current_value' => $asset->current_value,
            'valued_at' => $asset->current_valued_at?->toDateString(),
            'source' => $asset->current_source,
            'selected' => $asset->include_in_net_worth,
            'included' => $asset->include_in_net_worth && $asset->current_value !== null,
        ]);

        $accountsQuery = DB::table('finance_accounts')
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->where('include_in_net_worth', true)
            ->whereNotIn('id', $linkedAccountIds->isEmpty() ? [-1] : $linkedAccountIds->all())
            ->select('currency')
            ->selectRaw(
                'CAST(opening_balance
                    + COALESCE((SELECT SUM(amount) FROM finance_transactions WHERE finance_transactions.account_id = finance_accounts.id AND finance_transactions.type = ?), 0)
                    - COALESCE((SELECT SUM(amount) FROM finance_transactions WHERE finance_transactions.account_id = finance_accounts.id AND finance_transactions.type = ?), 0)
                    - COALESCE((SELECT SUM(from_amount) FROM finance_transfers WHERE finance_transfers.from_account_id = finance_accounts.id), 0)
                    + COALESCE((SELECT SUM(to_amount) FROM finance_transfers WHERE finance_transfers.to_account_id = finance_accounts.id), 0)
                    AS DECIMAL(19, 4)) AS amount',
                ['income', 'expense'],
            );
        $assetQuery = DB::table('finance_assets')
            ->where('owner_id', $ownerId)
            ->whereNull('archived_at')
            ->where('include_in_net_worth', true)
            ->whereNotNull('current_value')
            ->select('currency')
            ->selectRaw('current_value AS amount');
        $items = $accountsQuery->unionAll($assetQuery);
        $totals = DB::query()->fromSub($items, 'net_worth_items')
            ->select('currency')
            ->selectRaw('CAST(SUM(amount) AS DECIMAL(19, 4)) AS amount')
            ->groupBy('currency')
            ->orderBy('currency')
            ->get()
            ->map(fn ($row): array => ['currency' => $row->currency, 'amount' => $this->formatDecimal((string) $row->amount)])
            ->values();

        $groups = DB::table('finance_assets')
            ->where('owner_id', $ownerId)
            ->whereNull('archived_at')
            ->where('include_in_net_worth', true)
            ->whereNotNull('current_value')
            ->select('asset_type', 'currency')
            ->selectRaw('COUNT(*) AS asset_count')
            ->selectRaw('CAST(SUM(current_value) AS DECIMAL(19, 4)) AS amount')
            ->groupBy('asset_type', 'currency')
            ->orderBy('asset_type')
            ->orderBy('currency')
            ->get()
            ->map(fn ($row): array => [
                'asset_type' => $row->asset_type,
                'currency' => $row->currency,
                'asset_count' => (int) $row->asset_count,
                'amount' => $this->formatDecimal((string) $row->amount),
            ])
            ->values();

        return [
            'totals' => $totals,
            'accounts' => $accountRows,
            'assets' => $assetRows,
            'asset_groups' => $groups,
        ];
    }

    public function __construct(private readonly ManageFinanceAccounts $accounts) {}

    private function formatDecimal(string $value): string
    {
        $negative = str_starts_with($value, '-');
        $unsigned = ltrim($value, '-');
        [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '');
        $whole = ltrim($whole, '0') ?: '0';
        $formatted = $whole.'.'.str_pad(substr($fraction, 0, 4), 4, '0');

        return $negative && $formatted !== '0.0000' ? '-'.$formatted : $formatted;
    }
}
