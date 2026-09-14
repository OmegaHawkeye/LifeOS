<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceAccount>
 */
class FinanceAccountFactory extends Factory
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
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['checking', 'savings', 'credit_card', 'cash', 'investment', 'other']),
            'currency' => 'EUR',
            'opening_balance' => '0.0000',
            'is_archived' => false,
        ];
    }
}
