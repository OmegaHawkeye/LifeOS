<?php

namespace App\Modules\Nutrition\Application;

use App\Modules\Nutrition\Models\NutritionPlanItem;
use App\Modules\Nutrition\Models\NutritionRecipe;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageNutritionPlans
{
    /** @return Collection<int, NutritionPlanItem> */
    public function forWeek(int|string $ownerId, string $weekStart): Collection
    {
        $start = CarbonImmutable::parse($weekStart)->startOfDay();

        return NutritionPlanItem::query()
            ->where('owner_id', $ownerId)
            ->whereBetween('plan_date', [$start->toDateString(), $start->addDays(6)->toDateString()])
            ->with('recipe')
            ->orderBy('plan_date')
            ->orderBy('meal_slot')
            ->orderBy('id')
            ->get();
    }

    /** @param array<string, mixed> $planItemData */
    public function create(int|string $ownerId, array $planItemData): NutritionPlanItem
    {
        $recipe = $this->ownedRecipe($ownerId, (int) $planItemData['recipe_id']);

        return NutritionPlanItem::query()->create([
            ...$planItemData,
            'owner_id' => $ownerId,
            'recipe_name' => $recipe->name,
            'servings' => $planItemData['servings'] ?? 1,
            'status' => $planItemData['status'] ?? 'planned',
        ])->load('recipe');
    }

    /** @param array<string, mixed> $planItemData */
    public function update(int|string $ownerId, int $itemId, array $planItemData): NutritionPlanItem
    {
        $item = NutritionPlanItem::query()->where('owner_id', $ownerId)->findOrFail($itemId);
        if (isset($planItemData['recipe_id'])) {
            $planItemData['recipe_name'] = $this->ownedRecipe($ownerId, (int) $planItemData['recipe_id'])->name;
        }
        $item->update($planItemData);

        return $item->refresh()->load('recipe');
    }

    /**
     * @return Collection<int, NutritionPlanItem>
     */
    public function copyWeek(int|string $ownerId, string $sourceWeekStart, string $targetWeekStart): Collection
    {
        $sourceStart = CarbonImmutable::parse($sourceWeekStart)->startOfDay();
        $targetStart = CarbonImmutable::parse($targetWeekStart)->startOfDay();

        return DB::transaction(function () use ($ownerId, $sourceStart, $targetStart): Collection {
            $targetEnd = $targetStart->addDays(6);
            $targetHasItems = NutritionPlanItem::query()
                ->where('owner_id', $ownerId)
                ->whereBetween('plan_date', [$targetStart->toDateString(), $targetEnd->toDateString()])
                ->exists();
            if ($targetHasItems) {
                throw ValidationException::withMessages([
                    'target_week_start' => ['The destination week already has planned meals.'],
                ]);
            }

            $sourceItems = NutritionPlanItem::query()
                ->where('owner_id', $ownerId)
                ->whereBetween('plan_date', [$sourceStart->toDateString(), $sourceStart->addDays(6)->toDateString()])
                ->get();
            if ($sourceItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'source_week_start' => ['The source week has no planned meals to copy.'],
                ]);
            }
            foreach ($sourceItems as $sourceItem) {
                NutritionPlanItem::query()->create([
                    'owner_id' => $ownerId,
                    'recipe_id' => $sourceItem->recipe_id,
                    'recipe_name' => $sourceItem->recipe_name,
                    'plan_date' => $targetStart->addDays($sourceStart->diffInDays($sourceItem->plan_date))->toDateString(),
                    'meal_slot' => $sourceItem->meal_slot,
                    'servings' => $sourceItem->servings,
                    'status' => 'planned',
                    'notes' => $sourceItem->notes,
                ]);
            }

            return $this->forWeek($ownerId, $targetStart->toDateString());
        });
    }

    private function ownedRecipe(int|string $ownerId, int $recipeId): NutritionRecipe
    {
        return NutritionRecipe::query()->where('owner_id', $ownerId)->findOrFail($recipeId);
    }
}
