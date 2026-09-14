<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinancePayee;
use App\Modules\Finance\Models\FinanceTag;
use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageFinanceTransactions
{
    /**
     * @param  array{account_id?: int|string, category_id?: int|string, date_from?: string, date_to?: string, tag?: string, search?: string}  $filters
     * @return Collection<int, FinanceTransaction>
     */
    public function forOwner(int|string $ownerId, array $filters = []): Collection
    {
        return $this->filteredQuery($ownerId, $filters)
            ->with(['category', 'payee', 'tags'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array{account_id?: int|string, category_id?: int|string, date_from?: string, date_to?: string, tag?: string, search?: string}  $filters
     * @return Builder<FinanceTransaction>
     */
    public function filteredQuery(int|string $ownerId, array $filters = []): Builder
    {
        return FinanceTransaction::query()
            ->where('finance_transactions.owner_id', $ownerId)
            ->when(isset($filters['account_id']), fn (Builder $query): Builder => $query->where('finance_transactions.account_id', $filters['account_id']))
            ->when(isset($filters['category_id']), fn (Builder $query): Builder => $query->where('finance_transactions.category_id', $filters['category_id']))
            ->when(isset($filters['date_from']), fn (Builder $query): Builder => $query->whereDate('finance_transactions.occurred_at', '>=', $filters['date_from']))
            ->when(isset($filters['date_to']), fn (Builder $query): Builder => $query->whereDate('finance_transactions.occurred_at', '<=', $filters['date_to']))
            ->when(isset($filters['tag']), fn (Builder $query): Builder => $query->whereHas(
                'tags',
                fn (Builder $tags): Builder => $tags->where('normalized_name', Str::lower(trim($filters['tag']))),
            ))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function (Builder $query) use ($filters): Builder {
                $term = '%'.trim($filters['search']).'%';

                return $query->where(function (Builder $matches) use ($term): void {
                    $normalizedTerm = Str::lower($term);

                    $matches->whereRaw('LOWER(finance_transactions.description) LIKE ?', [$normalizedTerm])
                        ->orWhereHas('payee', fn (Builder $payees): Builder => $payees->whereRaw('LOWER(name) LIKE ?', [$normalizedTerm]))
                        ->orWhereHas('tags', fn (Builder $tags): Builder => $tags->whereRaw('LOWER(name) LIKE ?', [$normalizedTerm]));
                });
            });
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

    /**
     * @param  array{account_id?: int|string, category_id?: int|string|null, type?: string, amount?: string|int|float, description?: string|null, occurred_at?: string, payee?: string|null, tags?: array<int, string>}  $attributes
     */
    public function update(int|string $ownerId, int $transactionId, array $attributes): FinanceTransaction
    {
        return DB::transaction(function () use ($ownerId, $transactionId, $attributes): FinanceTransaction {
            $transaction = FinanceTransaction::query()
                ->where('owner_id', $ownerId)
                ->findOrFail($transactionId);
            $account = FinanceAccount::query()
                ->where('owner_id', $ownerId)
                ->where('is_archived', false)
                ->findOrFail($attributes['account_id'] ?? $transaction->account_id);
            $type = $attributes['type'] ?? $transaction->type;
            $categoryId = array_key_exists('category_id', $attributes)
                ? $attributes['category_id']
                : $transaction->category_id;
            $category = null;

            if ($categoryId !== null) {
                $category = FinanceCategory::query()
                    ->where('owner_id', $ownerId)
                    ->where('is_archived', false)
                    ->findOrFail($categoryId);

                if ($category->type !== $type) {
                    throw ValidationException::withMessages([
                        'category_id' => 'The category type must match the transaction type.',
                    ]);
                }
            }

            $transaction->fill([
                'type' => $type,
                'amount' => $attributes['amount'] ?? $transaction->amount,
                'currency' => $account->currency,
                'description' => array_key_exists('description', $attributes)
                    ? $attributes['description']
                    : $transaction->description,
                'occurred_at' => $attributes['occurred_at'] ?? $transaction->occurred_at,
            ]);
            $transaction->account_id = $account->id;
            $transaction->category_id = $category?->id;

            if (array_key_exists('payee', $attributes)) {
                $transaction->payee_id = $this->findOrCreatePayee($ownerId, $attributes['payee'])?->id;
            }

            $transaction->save();

            if (array_key_exists('tags', $attributes)) {
                $tagIds = collect($attributes['tags'])
                    ->map(fn (string $name): FinanceTag => $this->findOrCreateTag($ownerId, $name))
                    ->map(fn (FinanceTag $tag): int => $tag->id)
                    ->all();
                $transaction->tags()->sync($tagIds);
            }

            return $transaction->load(['category', 'payee', 'tags']);
        });
    }

    public function delete(int|string $ownerId, int $transactionId): void
    {
        FinanceTransaction::query()
            ->where('owner_id', $ownerId)
            ->findOrFail($transactionId)
            ->delete();
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
