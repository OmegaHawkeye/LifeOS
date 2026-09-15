<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinanceRecurringPattern;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class ManageFinanceSubscriptions
{
    /**
     * @return Collection<int, FinanceRecurringPattern>
     */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceRecurringPattern::query()
            ->where('owner_id', $ownerId)
            ->where('type', 'expense')
            ->with(['account', 'category'])
            ->orderBy('next_occurrence_on')
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  array{account_id: int|string, name: string, amount: string|int|float, billing_cycle: string, next_renewal_on: string, category_id?: int|string|null}  $attributes
     */
    public function create(int|string $ownerId, array $attributes): FinanceRecurringPattern
    {
        $account = $this->account($ownerId, (int) $attributes['account_id']);
        $category = $this->category($ownerId, $attributes['category_id'] ?? null);

        $subscription = new FinanceRecurringPattern([
            'type' => 'expense',
            'amount' => $attributes['amount'],
            'currency' => $account->currency,
            'frequency' => $attributes['billing_cycle'],
            'interval' => 1,
            'starts_on' => now()->toDateString(),
            'next_occurrence_on' => $attributes['next_renewal_on'],
            'description' => $attributes['name'],
            'is_active' => true,
            'status' => 'active',
        ]);
        $subscription->owner_id = $ownerId;
        $subscription->account_id = $account->id;
        $subscription->category_id = $category?->id;
        $subscription->save();

        return $subscription->load(['account', 'category']);
    }

    /**
     * @param  array{account_id?: int|string, category_id?: int|string|null, name?: string, amount?: string|int|float, billing_cycle?: string, next_renewal_on?: string, status?: string}  $attributes
     */
    public function update(int|string $ownerId, int $subscriptionId, array $attributes): FinanceRecurringPattern
    {
        $subscription = FinanceRecurringPattern::query()
            ->where('owner_id', $ownerId)
            ->where('type', 'expense')
            ->findOrFail($subscriptionId);
        $account = $this->account($ownerId, (int) ($attributes['account_id'] ?? $subscription->account_id));
        $categoryId = array_key_exists('category_id', $attributes)
            ? $attributes['category_id']
            : $subscription->category_id;
        $category = $this->category($ownerId, $categoryId);

        $updates = [];

        foreach (['amount', 'next_renewal_on'] as $field) {
            if (array_key_exists($field, $attributes)) {
                $updates[$field === 'next_renewal_on' ? 'next_occurrence_on' : $field] = $attributes[$field];
            }
        }

        if (isset($attributes['billing_cycle'])) {
            $updates['frequency'] = $attributes['billing_cycle'];
        }

        if (isset($attributes['name'])) {
            $updates['description'] = $attributes['name'];
        }

        if (isset($attributes['status'])) {
            $updates['status'] = $attributes['status'];
            $updates['is_active'] = $attributes['status'] === 'active';
        }

        $subscription->fill($updates);
        $subscription->account_id = $account->id;
        $subscription->currency = $account->currency;
        $subscription->category_id = $category?->id;
        $subscription->save();

        return $subscription->refresh()->load(['account', 'category']);
    }

    private function account(int|string $ownerId, int $accountId): FinanceAccount
    {
        return FinanceAccount::query()
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->findOrFail($accountId);
    }

    private function category(int|string $ownerId, int|string|null $categoryId): ?FinanceCategory
    {
        if ($categoryId === null) {
            return null;
        }

        $category = FinanceCategory::query()
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->findOrFail($categoryId);

        if ($category->type !== 'expense') {
            throw ValidationException::withMessages([
                'category_id' => 'A subscription must use an expense category.',
            ]);
        }

        return $category;
    }
}
