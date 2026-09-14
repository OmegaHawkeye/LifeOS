<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Finance\Application\ManageFinanceTransactions;
use App\Modules\Finance\Application\ManageFinanceTransfers;
use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinanceRecurringPattern;
use App\Modules\Foundation\Models\OwnerSettings;
use Illuminate\Database\Seeder;

class FinanceSeeder extends Seeder
{
    public function run(
        ManageFinanceTransactions $transactions,
        ManageFinanceTransfers $transfers,
    ): void {
        $owner = User::query()->first();

        if ($owner === null) {
            return;
        }

        $settings = $owner->settings()->firstOrCreate([], OwnerSettings::defaults());
        $checking = $this->account($owner->getKey(), 'Everyday checking', 'checking', $settings->currency, '1500.0000');
        $savings = $this->account($owner->getKey(), 'Emergency savings', 'savings', $settings->currency, '500.0000');
        $groceries = $this->category($owner->getKey(), 'Groceries', 'expense');
        $housing = $this->category($owner->getKey(), 'Housing', 'expense');

        if (! $checking->transactions()->where('description', 'Example grocery purchase')->exists()) {
            $transactions->create($owner->getKey(), [
                'account_id' => $checking->id,
                'category_id' => $groceries->id,
                'type' => 'expense',
                'amount' => '34.9000',
                'description' => 'Example grocery purchase',
                'occurred_at' => now()->subDays(2)->toIso8601String(),
                'payee' => 'Local market',
                'tags' => ['example', 'weekly shop'],
            ]);
        }

        if (! $checking->outgoingTransfers()->where('description', 'Example savings transfer')->exists()) {
            $transfers->create($owner->getKey(), [
                'from_account_id' => $checking->id,
                'to_account_id' => $savings->id,
                'from_amount' => '100.0000',
                'occurred_at' => now()->subDay()->toIso8601String(),
                'description' => 'Example savings transfer',
            ]);
        }

        if (! $checking->transactions()->where('description', 'Example rent payment')->exists()) {
            $transactions->create($owner->getKey(), [
                'account_id' => $checking->id,
                'category_id' => $housing->id,
                'type' => 'expense',
                'amount' => '850.0000',
                'description' => 'Example rent payment',
                'occurred_at' => now()->subDays(5)->toIso8601String(),
                'payee' => 'Example landlord',
                'tags' => ['example', 'monthly'],
            ]);
        }

        if (! FinanceRecurringPattern::query()
            ->where('owner_id', $owner->getKey())
            ->where('description', 'Example monthly rent')
            ->exists()) {
            $pattern = new FinanceRecurringPattern([
                'type' => 'expense',
                'amount' => '850.0000',
                'currency' => $settings->currency,
                'frequency' => 'monthly',
                'interval' => 1,
                'starts_on' => now()->startOfMonth()->toDateString(),
                'next_occurrence_on' => now()->addMonth()->startOfMonth()->toDateString(),
                'description' => 'Example monthly rent',
                'is_active' => true,
            ]);
            $pattern->owner_id = $owner->getKey();
            $pattern->account_id = $checking->id;
            $pattern->category_id = $housing->id;
            $pattern->save();
        }
    }

    private function account(int|string $ownerId, string $name, string $type, string $currency, string $openingBalance): FinanceAccount
    {
        $account = FinanceAccount::query()
            ->where('owner_id', $ownerId)
            ->where('name', $name)
            ->first();

        if ($account !== null) {
            return $account;
        }

        $account = new FinanceAccount([
            'name' => $name,
            'type' => $type,
            'currency' => $currency,
            'opening_balance' => $openingBalance,
        ]);
        $account->owner_id = $ownerId;
        $account->save();

        return $account;
    }

    private function category(int|string $ownerId, string $name, string $type): FinanceCategory
    {
        $category = FinanceCategory::query()
            ->where('owner_id', $ownerId)
            ->where('name', $name)
            ->where('type', $type)
            ->first();

        if ($category !== null) {
            return $category;
        }

        $category = new FinanceCategory(['name' => $name, 'type' => $type]);
        $category->owner_id = $ownerId;
        $category->save();

        return $category;
    }
}
