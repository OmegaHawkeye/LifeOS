<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceBudget;
use App\Modules\Finance\Models\FinanceCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceBudget>
 */
class FinanceBudgetFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'category_id' => FinanceCategory::factory(),
            'month' => now()->startOfMonth()->toDateString(),
            'currency' => 'EUR',
            'target_amount' => '500.0000',
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (FinanceBudget $budget): void {
            $budget->owner_id = FinanceCategory::query()
                ->findOrFail($budget->category_id)
                ->owner_id;
        });
    }
}
