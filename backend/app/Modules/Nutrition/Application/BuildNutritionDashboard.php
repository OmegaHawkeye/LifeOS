<?php

namespace App\Modules\Nutrition\Application;

use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use App\Modules\Nutrition\Models\NutritionMeal;
use App\Modules\Nutrition\Models\NutritionPlanItem;
use App\Modules\Nutrition\Models\NutritionRecipe;
use App\Modules\Nutrition\Models\NutritionShoppingList;
use App\Modules\Nutrition\Models\NutritionTarget;
use Carbon\CarbonImmutable;

class BuildNutritionDashboard
{
    private const NUTRIENTS = ['calories', 'protein_grams', 'carbohydrate_grams', 'fat_grams'];

    public function __construct(private readonly ManageOwnerSettings $ownerSettings) {}

    /** @return array<string, mixed> */
    public function forWeek(int|string $ownerId, string $weekStart): array
    {
        $timezone = $this->ownerSettings->timezoneForOwnerId($ownerId);
        $start = CarbonImmutable::parse($weekStart, $timezone)->startOfDay();
        $end = $start->addDays(6)->endOfDay();
        $nextStart = $start->addDays(7);
        $nextEnd = $nextStart->addDays(6);
        $todayDate = CarbonImmutable::now($timezone)->toDateString();

        $planItems = NutritionPlanItem::query()
            ->where('owner_id', $ownerId)
            ->whereBetween('plan_date', [$start->toDateString(), $end->toDateString()])
            ->with('recipe')
            ->orderBy('plan_date')
            ->orderBy('meal_slot')
            ->orderBy('id')
            ->get();
        $actualMeals = NutritionMeal::query()
            ->where('owner_id', $ownerId)
            ->whereBetween('eaten_at', [$start->utc(), $end->utc()])
            ->orderBy('eaten_at')
            ->orderBy('id')
            ->get();

        $daily = [];
        for ($dayOffset = 0; $dayOffset < 7; $dayOffset++) {
            $date = $start->addDays($dayOffset)->toDateString();
            $daily[$date] = [
                'date' => $date,
                'planned_meal_count' => 0,
                'eaten_meal_count' => 0,
                'planned' => $this->emptyNutrients(),
                'eaten' => $this->emptyNutrients(),
            ];
        }

        $todayPlan = [];
        $todayEaten = [];
        $statusCounts = ['skipped' => 0, 'replaced' => 0, 'marked_eaten' => 0];
        $prepNeededCount = 0;
        $recipeCounts = [];
        $plannedTotals = $this->emptyNutrients();
        $eatenTotals = $this->emptyNutrients();
        foreach ($planItems as $planItem) {
            $date = CarbonImmutable::parse($planItem->plan_date)->toDateString();
            $servings = (float) $planItem->servings;
            $nutrients = $this->recipeNutrients($planItem, $servings);
            if ($planItem->status === 'skipped' || $planItem->status === 'replaced') {
                $statusCounts[$planItem->status]++;
            } else {
                $daily[$date]['planned_meal_count']++;
                $daily[$date]['planned'] = $this->addNutrients($daily[$date]['planned'], $nutrients);
                $plannedTotals = $this->addNutrients($plannedTotals, $nutrients);
                if ($planItem->recipe_id !== null) {
                    $recipeId = (string) $planItem->recipe_id;
                    $recipeCounts[$recipeId] ??= [
                        'recipe_id' => (int) $planItem->recipe_id,
                        'recipe_name' => $planItem->recipe_name,
                        'planned_count' => 0,
                    ];
                    $recipeCounts[$recipeId]['planned_count']++;
                }
                $recipe = $planItem->getRelation('recipe');
                $recipeTagsJson = $recipe instanceof NutritionRecipe ? $recipe->getRawOriginal('tags') : null;
                $recipeTags = is_string($recipeTagsJson) ? json_decode($recipeTagsJson, true) : null;
                if ($planItem->status === 'planned'
                    && is_array($recipeTags)
                    && in_array('meal-prep', $recipeTags, true)) {
                    $prepNeededCount++;
                }
            }
            if ($planItem->status === 'eaten') {
                $statusCounts['marked_eaten']++;
            }
            if ($date === $todayDate) {
                $todayPlan[] = [
                    'id' => $planItem->id,
                    'recipe_name' => $planItem->recipe_name,
                    'meal_slot' => $planItem->meal_slot,
                    'servings' => $planItem->servings,
                    'status' => $planItem->status,
                    ...$nutrients,
                ];
            }
        }

        foreach ($actualMeals as $actualMeal) {
            $date = CarbonImmutable::parse(
                (string) $actualMeal->getRawOriginal('eaten_at'),
                'UTC',
            )->setTimezone($timezone)->toDateString();
            $nutrients = $this->mealNutrients($actualMeal);
            $daily[$date]['eaten_meal_count']++;
            $daily[$date]['eaten'] = $this->addNutrients($daily[$date]['eaten'], $nutrients);
            $eatenTotals = $this->addNutrients($eatenTotals, $nutrients);
            if ($date === $todayDate) {
                $todayEaten[] = [
                    'id' => $actualMeal->id,
                    'name' => $actualMeal->name,
                    'meal_type' => $actualMeal->meal_type,
                    ...$nutrients,
                ];
            }
        }

        foreach ($daily as &$day) {
            $day['planned'] = $this->formatNutrients($day['planned']);
            $day['eaten'] = $this->formatNutrients($day['eaten']);
        }
        unset($day);

        $today = $daily[$todayDate] ?? [
            'date' => $todayDate,
            'planned_meal_count' => 0,
            'eaten_meal_count' => 0,
            'planned' => $this->formatNutrients($this->emptyNutrients()),
            'eaten' => $this->formatNutrients($this->emptyNutrients()),
        ];
        $activePlanItems = $planItems->reject(fn (NutritionPlanItem $item): bool => in_array($item->status, ['skipped', 'replaced'], true));
        $planningGaps = collect($daily)
            ->filter(fn (array $day): bool => $day['planned_meal_count'] === 0)
            ->pluck('date')
            ->values()
            ->all();
        $nextWeekHasPlan = NutritionPlanItem::query()
            ->where('owner_id', $ownerId)
            ->whereBetween('plan_date', [$nextStart->toDateString(), $nextEnd->toDateString()])
            ->exists();
        $shoppingListMissing = $activePlanItems->isNotEmpty() && ! NutritionShoppingList::query()
            ->where('owner_id', $ownerId)
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->exists();

        $target = NutritionTarget::query()->where('owner_id', $ownerId)->first();

        return [
            'week_start' => $start->toDateString(),
            'week_end' => $end->toDateString(),
            'timezone' => $timezone,
            'target' => [
                'calories' => $target?->calories,
                'protein_grams' => $target?->protein_grams,
                'carbohydrate_grams' => $target?->carbohydrate_grams,
                'fat_grams' => $target?->fat_grams,
            ],
            'today' => [
                'date' => $todayDate,
                'plan' => $todayPlan,
                'eaten_meals' => $todayEaten,
                'planned_meal_count' => $today['planned_meal_count'],
                'eaten_meal_count' => $today['eaten_meal_count'],
                'planned' => $today['planned'],
                'eaten' => $today['eaten'],
            ],
            'week' => [
                'planned_meal_count' => $activePlanItems->count(),
                'eaten_meal_count' => $actualMeals->count(),
                'status_counts' => $statusCounts,
                'planned' => $this->formatNutrients($plannedTotals),
                'eaten' => $this->formatNutrients($eatenTotals),
                'daily' => array_values($daily),
                'prep_needed_count' => $prepNeededCount,
                'shopping_list_missing' => $shoppingListMissing,
            ],
            'review' => [
                'reusable_meals' => collect($recipeCounts)
                    ->filter(fn (array $recipe): bool => $recipe['planned_count'] > 1)
                    ->sortByDesc('planned_count')
                    ->values()
                    ->all(),
                'planning_gaps' => $planningGaps,
                'next_week' => [
                    'start_date' => $nextStart->toDateString(),
                    'has_plan' => $nextWeekHasPlan,
                    'can_copy' => $activePlanItems->isNotEmpty() && ! $nextWeekHasPlan,
                ],
            ],
        ];
    }

    /**
     * @return array{
     *     values: array<string, float>,
     *     unknown_counts: array<string, int>,
     *     entry_count: int
     * }
     */
    private function emptyNutrients(): array
    {
        return [
            'values' => array_fill_keys(self::NUTRIENTS, 0.0),
            'unknown_counts' => array_fill_keys(self::NUTRIENTS, 0),
            'entry_count' => 0,
        ];
    }

    /**
     * @param  array{values: array<string, float>, unknown_counts: array<string, int>, entry_count: int}  $totals
     * @param  array<string, float|string|null>  $nutrients
     * @return array{values: array<string, float>, unknown_counts: array<string, int>, entry_count: int}
     */
    private function addNutrients(array $totals, array $nutrients): array
    {
        $totals['entry_count']++;
        foreach (self::NUTRIENTS as $nutrient) {
            if (($nutrients[$nutrient] ?? null) === null) {
                $totals['unknown_counts'][$nutrient]++;
            } else {
                $totals['values'][$nutrient] += (float) $nutrients[$nutrient];
            }
        }

        return $totals;
    }

    /**
     * @param  array{values: array<string, float>, unknown_counts: array<string, int>, entry_count: int}  $nutrients
     * @return array<string, string|null>
     */
    private function formatNutrients(array $nutrients): array
    {
        $formatted = [];
        foreach (self::NUTRIENTS as $nutrient) {
            $formatted[$nutrient] = $nutrients['unknown_counts'][$nutrient] > 0
                ? null
                : number_format($nutrients['values'][$nutrient], 2, '.', '');
        }

        return $formatted;
    }

    /** @return array<string, string|null> */
    private function recipeNutrients(NutritionPlanItem $planItem, float $servings): array
    {
        $recipe = $planItem->recipe;
        $nutrients = [];
        foreach (self::NUTRIENTS as $nutrient) {
            $nutrients[$nutrient] = $recipe?->{$nutrient} === null
                ? null
                : number_format((float) $recipe->{$nutrient} * $servings, 2, '.', '');
        }

        return $nutrients;
    }

    /** @return array<string, string|null> */
    private function mealNutrients(NutritionMeal $meal): array
    {
        $nutrients = [];
        foreach (self::NUTRIENTS as $nutrient) {
            $nutrients[$nutrient] = $meal->{$nutrient} === null ? null : (string) $meal->{$nutrient};
        }

        return $nutrients;
    }
}
