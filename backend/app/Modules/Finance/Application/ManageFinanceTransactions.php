<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinancePayee;
use App\Modules\Finance\Models\FinanceTag;
use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageFinanceTransactions
{
    /**
     * @return Collection<int, FinanceTransaction>
     */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceTransaction::query()
            ->where('owner_id', $ownerId)
            ->with(['category', 'payee', 'tags'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array{account_id: int|string, category_id?: int|string|null, type: string, amount: string|int|float, description?: string|null, occurred_at: string, payee?: string|null, tags?: array<int, string>}  $attributes
     */
    public function create(int|string $ownerId, array $attributes): FinanceTransaction
    {
        return DB::transaction(function () use ($ownerId, $attributes): FinanceTransaction {
            $account = FinanceAccount::query()
                ->where('owner_id', $ownerId)
                ->where('is_archived', false)
                ->findOrFail($attributes['account_id']);

            $category = null;

            if (($attributes['category_id'] ?? null) !== null) {
                $category = FinanceCategory::query()
                    ->where('owner_id', $ownerId)
                    ->where('is_archived', false)
                    ->findOrFail($attributes['category_id']);

                if ($category->type !== $attributes['type']) {
                    throw ValidationException::withMessages([
                        'category_id' => 'The category type must match the transaction type.',
                    ]);
                }
            }

            $payee = $this->findOrCreatePayee($ownerId, $attributes['payee'] ?? null);
            $transaction = new FinanceTransaction([
                'type' => $attributes['type'],
                'amount' => $attributes['amount'],
                'currency' => $account->currency,
                'description' => $attributes['description'] ?? null,
                'occurred_at' => $attributes['occurred_at'],
            ]);
            $transaction->owner_id = $ownerId;
            $transaction->account_id = $account->id;
            $transaction->category_id = $category?->id;
            $transaction->payee_id = $payee?->id;
            $transaction->save();

            $tagIds = collect($attributes['tags'] ?? [])
                ->map(fn (string $name): FinanceTag => $this->findOrCreateTag($ownerId, $name))
                ->map(fn (FinanceTag $tag): int => $tag->id)
                ->all();
            $transaction->tags()->sync($tagIds);

            return $transaction->load(['category', 'payee', 'tags']);
        });
    }

    private function findOrCreatePayee(int|string $ownerId, ?string $name): ?FinancePayee
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        $normalizedName = Str::lower(trim($name));
        $payee = FinancePayee::query()
            ->where('owner_id', $ownerId)
            ->where('normalized_name', $normalizedName)
            ->first();

        if ($payee !== null) {
            return $payee;
        }

        $payee = new FinancePayee(['name' => trim($name), 'normalized_name' => $normalizedName]);
        $payee->owner_id = $ownerId;
        $payee->save();

        return $payee;
    }

    private function findOrCreateTag(int|string $ownerId, string $name): FinanceTag
    {
        $normalizedName = Str::lower(trim($name));
        $tag = FinanceTag::query()
            ->where('owner_id', $ownerId)
            ->where('normalized_name', $normalizedName)
            ->first();

        if ($tag !== null) {
            return $tag;
        }

        $tag = new FinanceTag(['name' => trim($name), 'normalized_name' => $normalizedName]);
        $tag->owner_id = $ownerId;
        $tag->save();

        return $tag;
    }
}
