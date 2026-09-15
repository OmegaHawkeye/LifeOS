<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceBudgetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['category_id', 'month', 'currency', 'target_amount'])]
class FinanceBudget extends Model
{
    /** @use HasFactory<FinanceBudgetFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<FinanceCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(FinanceCategory::class, 'category_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:4',
        ];
    }
}
