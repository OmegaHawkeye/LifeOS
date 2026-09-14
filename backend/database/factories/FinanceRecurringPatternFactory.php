<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceRecurringPattern;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceRecurringPattern>
 */
class FinanceRecurringPatternFactory extends Factory
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
            'account_id' => FinanceAccount::factory(),
            'type' => fake()->randomElement(['income', 'expense']),
            'amount' => '20.0000',
            'currency' => 'EUR',
            'frequency' => fake()->randomElement(['weekly', 'monthly', 'quarterly', 'yearly']),
            'interval' => 1,
            'starts_on' => now()->toDateString(),
            'next_occurrence_on' => now()->addMonth()->toDateString(),
            'ends_on' => null,
            'description' => fake()->sentence(3),
            'is_active' => true,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (FinanceRecurringPattern $pattern): void {
            $pattern->owner_id = FinanceAccount::query()
                ->findOrFail($pattern->account_id)
                ->owner_id;
        });
    }
}
