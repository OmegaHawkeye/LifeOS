<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceTransfer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceTransfer>
 */
class FinanceTransferFactory extends Factory
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
            'from_account_id' => FinanceAccount::factory(),
            'to_account_id' => FinanceAccount::factory(),
            'from_amount' => '25.0000',
            'from_currency' => 'EUR',
            'to_amount' => '25.0000',
            'to_currency' => 'EUR',
            'description' => fake()->sentence(3),
            'occurred_at' => fake()->dateTimeBetween('-3 months', 'now'),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (FinanceTransfer $transfer): void {
            $source = FinanceAccount::query()->findOrFail($transfer->from_account_id);
            $destination = FinanceAccount::query()->findOrFail($transfer->to_account_id);
            $destination->owner_id = $source->owner_id;
            $destination->save();
            $transfer->owner_id = $source->owner_id;
        });
    }
}
