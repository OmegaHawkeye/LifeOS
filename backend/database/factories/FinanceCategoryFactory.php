<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceCategory>
 */
class FinanceCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->unique()->word(),
            'type' => fake()->randomElement(['income', 'expense']),
            'color' => '#10B981',
            'is_archived' => false,
        ];
    }
}
