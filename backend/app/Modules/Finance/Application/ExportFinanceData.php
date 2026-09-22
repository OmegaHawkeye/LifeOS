<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Finance\Models\FinanceAsset;
use App\Modules\Finance\Models\FinanceAssetValuation;
use App\Modules\Finance\Models\FinanceBudget;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinanceImportReference;
use App\Modules\Finance\Models\FinancePayee;
use App\Modules\Finance\Models\FinanceRecurringPattern;
use App\Modules\Finance\Models\FinanceSavingsGoal;
use App\Modules\Finance\Models\FinanceTag;
use App\Modules\Finance\Models\FinanceTransaction;
use App\Modules\Finance\Models\FinanceTransfer;
use Illuminate\Database\Eloquent\Relations\Relation;

class ExportFinanceData
{
    /** @return array<string, array<int, array<string, mixed>>> */
    public function forOwner(int|string $ownerId): array
    {
        return [
            'accounts' => FinanceAccount::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'categories' => FinanceCategory::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'budgets' => FinanceBudget::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'savings_goals' => FinanceSavingsGoal::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'recurring_patterns' => FinanceRecurringPattern::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'payees' => FinancePayee::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'tags' => FinanceTag::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'transactions' => FinanceTransaction::query()
                ->where('owner_id', $ownerId)
                ->with(['tags' => function (Relation $relation) use ($ownerId): void {
                    $relation->getQuery()->where('owner_id', $ownerId);
                }])
                ->orderBy('id')
                ->get()
                ->toArray(),
            'import_references' => FinanceImportReference::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'transfers' => FinanceTransfer::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'assets' => FinanceAsset::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'asset_valuations' => FinanceAssetValuation::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
        ];
    }
}
