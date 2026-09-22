<?php

namespace App\Modules\Nutrition\Application;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GetWeeklyNutritionSummary
{
    /** @return array{meals_logged: int, planned_meals: int, calories: string|null, protein_grams: string|null} */
    public function forOwner(int|string $ownerId, Carbon $start, Carbon $end): array
    {
        $meals = DB::table('nutrition_meals')
            ->where('owner_id', $ownerId)
            ->whereBetween('eaten_at', [$start, $end]);
        $mealCount = (int) $meals->count();
        $calories = (clone $meals)->sum('calories');
        $protein = (clone $meals)->sum('protein_grams');
        $calorieCoverage = (clone $meals)->whereNotNull('calories')->count();
        $proteinCoverage = (clone $meals)->whereNotNull('protein_grams')->count();

        return [
            'meals_logged' => $mealCount,
            'planned_meals' => (int) DB::table('nutrition_plan_items')
                ->where('owner_id', $ownerId)
                ->whereBetween('plan_date', [$start->toDateString(), $end->toDateString()])
                ->where('status', 'planned')
                ->count(),
            'calories' => $mealCount === 0 || $calorieCoverage < $mealCount ? null : number_format((float) $calories, 2, '.', ''),
            'protein_grams' => $mealCount === 0 || $proteinCoverage < $mealCount ? null : number_format((float) $protein, 2, '.', ''),
        ];
    }
}
