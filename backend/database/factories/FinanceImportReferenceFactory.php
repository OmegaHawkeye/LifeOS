<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceImportReference;
use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceImportReference>
 */
class FinanceImportReferenceFactory extends Factory
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
            'transaction_id' => FinanceTransaction::factory(),
            'provider' => 'csv',
            'external_id' => fake()->unique()->uuid(),
            'raw_metadata' => ['original_label' => fake()->words(2, true)],
            'imported_at' => now(),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (FinanceImportReference $reference): void {
            $reference->owner_id = FinanceTransaction::query()
                ->findOrFail($reference->transaction_id)
                ->owner_id;
        });
    }
}
