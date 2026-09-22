<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Routines\Models\Routine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Routine>
 */
class RoutineFactory extends Factory
{
    protected $model = Routine::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'title' => fake()->words(3, true),
            'domain' => fake()->randomElement(['finance', 'fitness', 'nutrition', 'review', 'personal']),
            'frequency' => 'daily',
            'days_of_week' => null,
            'reminder_time' => null,
            'is_active' => true,
        ];
    }
}
