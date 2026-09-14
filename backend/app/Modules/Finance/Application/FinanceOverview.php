<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use stdClass;

class FinanceOverview
{
    /**
     * @return array{
     *     month: string,
     *     totals: array<int, array{currency: string, income: string, spending: string, net_cashflow: string}>,
     *     category_breakdown: array<int, array{category_id: int|null, category_name: string, type: string, currency: string, total: string, transaction_count: int}>
     * }
     */
    public function forOwner(int|string $ownerId, string $month, ?int $accountId = null): array
    {
        $start = Carbon::parse($month.'-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $transactions = FinanceTransaction::query()
            ->where('finance_transactions.owner_id', $ownerId)
            ->whereBetween('finance_transactions.occurred_at', [$start, $end])
            ->when($accountId !== null, fn (Builder $query): Builder => $query->where('finance_transactions.account_id', $accountId));

        $totals = (clone $transactions)
            ->select('currency')
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income")
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS spending")
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_cashflow")
            ->groupBy('currency')
            ->orderBy('currency')
            ->toBase()
            ->get()
            ->map(fn (stdClass $row): array => [
                'currency' => (string) $row->currency,
                'income' => $this->decimal((string) $row->income),
                'spending' => $this->decimal((string) $row->spending),
                'net_cashflow' => $this->decimal((string) $row->net_cashflow),
            ])
            ->values()
            ->all();

        $categoryBreakdown = (clone $transactions)
            ->leftJoin('finance_categories', 'finance_categories.id', '=', 'finance_transactions.category_id')
            ->select('finance_categories.id as category_id', 'finance_categories.name as category_name')
            ->addSelect('finance_transactions.type', 'finance_transactions.currency')
            ->selectRaw('SUM(finance_transactions.amount) AS total')
            ->selectRaw('COUNT(finance_transactions.id) AS transaction_count')
            ->groupBy('finance_categories.id', 'finance_categories.name', 'finance_transactions.type', 'finance_transactions.currency')
            ->orderBy('finance_transactions.type')
            ->orderBy('finance_categories.name')
            ->toBase()
            ->get()
            ->map(fn (stdClass $row): array => [
                'category_id' => $row->category_id === null ? null : (int) $row->category_id,
                'category_name' => $row->category_name ?? 'Uncategorized',
                'type' => (string) $row->type,
                'currency' => (string) $row->currency,
                'total' => $this->decimal((string) $row->total),
                'transaction_count' => (int) $row->transaction_count,
            ])
            ->values()
            ->all();

        return [
            'month' => $start->format('Y-m'),
            'totals' => $totals,
            'category_breakdown' => $categoryBreakdown,
        ];
    }

    private function decimal(string $amount): string
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');

        return $whole.'.'.str_pad(substr($fraction, 0, 4), 4, '0');
    }
}
