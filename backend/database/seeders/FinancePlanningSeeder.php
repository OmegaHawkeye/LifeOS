<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Finance\Models\FinanceBudget;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinanceSavingsGoal;
use App\Modules\Foundation\Models\OwnerSettings;
use Illuminate\Database\Seeder;

class FinancePlanningSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $owner = User::query()->first();
        if ($owner === null) {
            return;
        }

        $currency = $owner->settings()->firstOrCreate([], OwnerSettings::defaults())->currency;
        $groceries = FinanceCategory::query()
            ->where('owner_id', $owner->getKey())
            ->where('name', 'Groceries')
            ->where('type', 'expense')
            ->first();

        if ($groceries !== null) {
            FinanceBudget::query()->firstOrCreate([
                'owner_id' => $owner->getKey(),
                'category_id' => $groceries->getKey(),
                'month' => now()->startOfMonth()->toDateString(),
                'currency' => $currency,
            ], ['target_amount' => '450.0000']);
        }

        FinanceSavingsGoal::query()->firstOrCreate([
            'owner_id' => $owner->getKey(),
            'name' => 'Emergency fund',
        ], [
            'target_amount' => '5000.0000',
            'current_amount' => '500.0000',
            'currency' => $currency,
            'target_date' => now()->addYear()->toDateString(),
        ]);
    }
}
