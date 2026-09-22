<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAccount;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class ManageFinanceAccounts
{
    /**
     * @return Collection<int, FinanceAccount>
     */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceAccount::query()
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->orderBy('name')
            ->select('finance_accounts.*')
            ->selectRaw(
                'CAST(finance_accounts.opening_balance
                    + COALESCE((SELECT SUM(amount) FROM finance_transactions WHERE finance_transactions.account_id = finance_accounts.id AND finance_transactions.type = ?), 0)
                    - COALESCE((SELECT SUM(amount) FROM finance_transactions WHERE finance_transactions.account_id = finance_accounts.id AND finance_transactions.type = ?), 0)
                    - COALESCE((SELECT SUM(from_amount) FROM finance_transfers WHERE finance_transfers.from_account_id = finance_accounts.id), 0)
                    + COALESCE((SELECT SUM(to_amount) FROM finance_transfers WHERE finance_transfers.to_account_id = finance_accounts.id), 0)
                    AS DECIMAL(19, 4)) AS balance',
                ['income', 'expense'],
            )
            ->get();
    }

    /**
     * @param  array{name: string, type: string, currency?: string, opening_balance?: string|int|float}  $attributes
     */
    public function create(int|string $ownerId, array $attributes, string $primaryCurrency): FinanceAccount
    {
        $account = new FinanceAccount([
            ...$attributes,
            'currency' => $attributes['currency'] ?? $primaryCurrency,
            'opening_balance' => $attributes['opening_balance'] ?? '0.0000',
            'include_in_net_worth' => true,
        ]);
        $account->owner_id = $ownerId;
        $account->save();

        return $account;
    }

    /** @param array{include_in_net_worth?: bool} $attributes */
    public function update(int|string $ownerId, int $accountId, array $attributes): FinanceAccount
    {
        $account = FinanceAccount::query()
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->findOrFail($accountId);
        $account->update($attributes);

        $updated = $this->forOwner($ownerId)->firstWhere('id', $accountId);
        if ($updated === null) {
            throw (new ModelNotFoundException)->setModel(FinanceAccount::class, [$accountId]);
        }

        return $updated;
    }
}
