<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Review\Models\WeeklyReview;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<WeeklyReview>
 */
class WeeklyReviewFactory extends Factory
{
    protected $model = WeeklyReview::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'week_start' => now()->startOfWeek(Carbon::MONDAY)->toDateString(),
            'notes' => fake()->optional()->paragraph(),
            'next_week_focus' => fake()->optional()->sentence(),
            'reviewed_at' => null,
        ];
    }
}
