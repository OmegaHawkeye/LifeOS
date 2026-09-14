<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceTransaction>
 */
class FinanceTransactionFactory extends Factory
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
            'amount' => fake()->randomFloat(4, 1, 500),
            'currency' => 'EUR',
            'description' => fake()->sentence(4),
            'occurred_at' => fake()->dateTimeBetween('-3 months', 'now'),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (FinanceTransaction $transaction): void {
            $transaction->owner_id = FinanceAccount::query()
                ->findOrFail($transaction->account_id)
                ->owner_id;
        });
    }
}
