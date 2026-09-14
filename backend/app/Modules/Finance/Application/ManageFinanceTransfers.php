<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceTransfer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageFinanceTransfers
{
    /**
     * @return Collection<int, FinanceTransfer>
     */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceTransfer::query()
            ->where('owner_id', $ownerId)
            ->with(['sourceAccount', 'destinationAccount'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array{from_account_id: int|string, to_account_id: int|string, from_amount: string|int|float, to_amount?: string|int|float, occurred_at: string, description?: string|null}  $attributes
     */
    public function create(int|string $ownerId, array $attributes): FinanceTransfer
    {
        return DB::transaction(function () use ($ownerId, $attributes): FinanceTransfer {
            $source = FinanceAccount::query()
                ->where('owner_id', $ownerId)
                ->where('is_archived', false)
                ->findOrFail($attributes['from_account_id']);
            $destination = FinanceAccount::query()
                ->where('owner_id', $ownerId)
                ->where('is_archived', false)
                ->findOrFail($attributes['to_account_id']);

            if ($source->id === $destination->id) {
                throw ValidationException::withMessages([
                    'to_account_id' => 'A transfer must use two different accounts.',
                ]);
            }

            if ($source->currency !== $destination->currency && ! array_key_exists('to_amount', $attributes)) {
                throw ValidationException::withMessages([
                    'to_amount' => 'A destination amount is required when transferring between currencies.',
                ]);
            }

            $destinationAmount = $attributes['to_amount'] ?? $attributes['from_amount'];

            if ($source->currency === $destination->currency
                && $this->decimalValue($attributes['from_amount']) !== $this->decimalValue($destinationAmount)) {
                throw ValidationException::withMessages([
                    'to_amount' => 'Same-currency transfers must have matching amounts.',
                ]);
            }

            $transfer = new FinanceTransfer([
                'from_amount' => $attributes['from_amount'],
                'from_currency' => $source->currency,
                'to_amount' => $destinationAmount,
                'to_currency' => $destination->currency,
                'description' => $attributes['description'] ?? null,
                'occurred_at' => $attributes['occurred_at'],
            ]);
            $transfer->owner_id = $ownerId;
            $transfer->from_account_id = $source->id;
            $transfer->to_account_id = $destination->id;
            $transfer->save();

            return $transfer->load(['sourceAccount', 'destinationAccount']);
        });
    }

    private function decimalValue(string|int|float $amount): string
    {
        [$integer, $fraction] = array_pad(explode('.', (string) $amount, 2), 2, '');

        return (ltrim($integer, '0') ?: '0').'.'.str_pad(substr($fraction, 0, 4), 4, '0');
    }
}
