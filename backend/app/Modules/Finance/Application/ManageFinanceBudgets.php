<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceBudget;
use App\Modules\Finance\Models\FinanceCategory;
use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ManageFinanceBudgets
{
    /**
     * @return Collection<int, FinanceBudget>
     */
    public function forOwner(int|string $ownerId, string $month): Collection
    {
        $start = Carbon::createFromFormat('!Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $spending = FinanceTransaction::query()
            ->select('category_id', 'currency')
            ->selectRaw('SUM(amount) AS spent')
            ->where('owner_id', $ownerId)
            ->where('type', 'expense')
            ->whereBetween('occurred_at', [$start, $end])
            ->groupBy('category_id', 'currency');

        return FinanceBudget::query()
            ->where('finance_budgets.owner_id', $ownerId)
            ->where('finance_budgets.month', $start->toDateString())
            ->join('finance_categories', 'finance_categories.id', '=', 'finance_budgets.category_id')
            ->leftJoinSub($spending, 'monthly_spending', function (JoinClause $join): void {
                $join->on('monthly_spending.category_id', '=', 'finance_budgets.category_id')
                    ->on('monthly_spending.currency', '=', 'finance_budgets.currency');
            })
            ->select('finance_budgets.*', 'finance_categories.name as category_name')
            ->selectRaw('COALESCE(monthly_spending.spent, 0) AS spent')
            ->selectRaw('CAST(finance_budgets.target_amount - COALESCE(monthly_spending.spent, 0) AS DECIMAL(19, 4)) AS remaining')
            ->selectRaw('CASE WHEN COALESCE(monthly_spending.spent, 0) > finance_budgets.target_amount THEN 1 ELSE 0 END AS is_over_budget')
            ->orderBy('finance_categories.name')
            ->orderBy('finance_budgets.currency')
            ->get();
    }

    /**
     * @param  array{category_id: int|string, month: string, currency: string, target_amount: string|int|float}  $attributes
     */
    public function create(int|string $ownerId, array $attributes): FinanceBudget
    {
        $category = $this->category($ownerId, (int) $attributes['category_id']);
        $this->ensureExpenseCategory($category);

        $budget = new FinanceBudget([
            ...$attributes,
            'month' => Carbon::createFromFormat('!Y-m', $attributes['month'])->startOfMonth()->toDateString(),
        ]);
        $budget->owner_id = $ownerId;
        $budget->save();

        return $budget;
    }

    /**
     * @param  array{category_id?: int|string, month?: string, currency?: string, target_amount?: string|int|float}  $attributes
     */
    public function update(int|string $ownerId, int $budgetId, array $attributes): FinanceBudget
    {
        $budget = FinanceBudget::query()
            ->where('owner_id', $ownerId)
            ->findOrFail($budgetId);
        $categoryId = (int) ($attributes['category_id'] ?? $budget->category_id);
        $category = $this->category($ownerId, $categoryId);
        $this->ensureExpenseCategory($category);

        if (isset($attributes['month'])) {
            $attributes['month'] = Carbon::createFromFormat('!Y-m', $attributes['month'])
                ->startOfMonth()
                ->toDateString();
        }

        $budget->update($attributes);

        return $budget->refresh();
    }

    public function delete(int|string $ownerId, int $budgetId): void
    {
        FinanceBudget::query()
            ->where('owner_id', $ownerId)
            ->findOrFail($budgetId)
            ->delete();
    }

    private function category(int|string $ownerId, int $categoryId): FinanceCategory
    {
        return FinanceCategory::query()
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->findOrFail($categoryId);
    }

    private function ensureExpenseCategory(FinanceCategory $category): void
    {
        if ($category->type !== 'expense') {
            throw ValidationException::withMessages([
                'category_id' => 'Budgets can only be assigned to expense categories.',
            ]);
        }
    }
}
