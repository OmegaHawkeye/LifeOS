<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceSavingsGoal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceSavingsGoal>
 */
class FinanceSavingsGoalFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->words(2, true),
            'target_amount' => '5000.0000',
            'current_amount' => '500.0000',
            'currency' => 'EUR',
            'target_date' => now()->addYear()->toDateString(),
        ];
    }
}
