<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceSavingsGoal;
use Illuminate\Database\Eloquent\Collection;

class ManageFinanceSavingsGoals
{
    /**
     * @return Collection<int, FinanceSavingsGoal>
     */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceSavingsGoal::query()
            ->where('owner_id', $ownerId)
            ->orderBy('target_date')
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  array{name: string, target_amount: string|int|float, current_amount?: string|int|float, currency: string, target_date: string}  $attributes
     */
    public function create(int|string $ownerId, array $attributes): FinanceSavingsGoal
    {
        $goal = new FinanceSavingsGoal([
            ...$attributes,
            'current_amount' => $attributes['current_amount'] ?? '0.0000',
        ]);
        $goal->owner_id = $ownerId;
        $goal->save();

        return $goal;
    }

    /**
     * @param  array{name?: string, target_amount?: string|int|float, current_amount?: string|int|float, currency?: string, target_date?: string}  $attributes
     */
    public function update(int|string $ownerId, int $goalId, array $attributes): FinanceSavingsGoal
    {
        $goal = FinanceSavingsGoal::query()
            ->where('owner_id', $ownerId)
            ->findOrFail($goalId);
        $goal->update($attributes);

        return $goal->refresh();
    }

    public function delete(int|string $ownerId, int $goalId): void
    {
        FinanceSavingsGoal::query()
            ->where('owner_id', $ownerId)
            ->findOrFail($goalId)
            ->delete();
    }
}
