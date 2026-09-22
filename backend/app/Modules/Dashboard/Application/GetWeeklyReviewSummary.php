<?php

namespace App\Modules\Dashboard\Application;

use App\Modules\Finance\Application\GetWeeklyFinanceSummary;
use App\Modules\Fitness\Application\GetWeeklyFitnessSummary;
use App\Modules\Nutrition\Application\GetWeeklyNutritionSummary;
use App\Modules\Review\Application\GetWeeklyReviewEntry;
use Illuminate\Support\Carbon;

class GetWeeklyReviewSummary
{
    public function __construct(
        private readonly GetWeeklyFinanceSummary $finance,
        private readonly GetWeeklyFitnessSummary $fitness,
        private readonly GetWeeklyNutritionSummary $nutrition,
        private readonly GetWeeklyReviewEntry $reviewEntries,
    ) {}

    /**
     * @return array{
     *     week_start: string,
     *     week_end: string,
     *     finance: array{transaction_count: int, totals: list<array{currency: string, income: string, expenses: string}>},
     *     fitness: array{completed_workouts: int, workout_minutes: int|null},
     *     nutrition: array{meals_logged: int, planned_meals: int, calories: string|null, protein_grams: string|null},
     *     review: array{notes: string|null, next_week_focus: string|null, reviewed_at: string|null}|null
     * }
     */
    public function forOwner(int|string $ownerId, Carbon $start): array
    {
        $end = $start->copy()->endOfWeek(Carbon::SUNDAY);

        return [
            'week_start' => $start->toDateString(),
            'week_end' => $end->toDateString(),
            'finance' => $this->finance->forOwner($ownerId, $start, $end),
            'fitness' => $this->fitness->forOwner($ownerId, $start, $end),
            'nutrition' => $this->nutrition->forOwner($ownerId, $start, $end),
            'review' => $this->reviewEntries->forOwner($ownerId, $start->toDateString()),
        ];
    }
}
