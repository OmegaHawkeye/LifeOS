<?php

namespace App\Modules\Finance\Application;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GetWeeklyFinanceSummary
{
    /**
     * @return array{transaction_count: int, totals: list<array{currency: string, income: string, expenses: string}>}
     */
    public function forOwner(int|string $ownerId, Carbon $start, Carbon $end): array
    {
        $rows = DB::table('finance_transactions')
            ->where('owner_id', $ownerId)
            ->whereBetween('occurred_at', [$start, $end])
            ->selectRaw('currency, SUM(CASE WHEN type = ? THEN amount ELSE 0 END) as income', ['income'])
            ->selectRaw('SUM(CASE WHEN type = ? THEN amount ELSE 0 END) as expenses', ['expense'])
            ->groupBy('currency')
            ->orderBy('currency')
            ->get();

        $totals = [];
        foreach ($rows as $row) {
            $totals[] = [
                'currency' => (string) $row->currency,
                'income' => number_format((float) $row->income, 4, '.', ''),
                'expenses' => number_format((float) $row->expenses, 4, '.', ''),
            ];
        }

        return [
            'transaction_count' => (int) DB::table('finance_transactions')
                ->where('owner_id', $ownerId)
                ->whereBetween('occurred_at', [$start, $end])
                ->count(),
            'totals' => $totals,
        ];
    }
}
