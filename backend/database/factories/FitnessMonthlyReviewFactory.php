<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessMonthlyReview;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessMonthlyReview> */
class FitnessMonthlyReviewFactory extends Factory
{
    protected $model = FitnessMonthlyReview::class;

    /** @return array{owner_id: int|Factory<User>, review_month: string, reviewed_at: null, notes: null} */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'review_month' => now()->startOfMonth()->toDateString(),
            'reviewed_at' => null,
            'notes' => null,
        ];
    }
}
