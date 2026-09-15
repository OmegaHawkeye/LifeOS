<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceRecurringPatternFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'amount', 'currency', 'frequency', 'interval', 'starts_on', 'next_occurrence_on', 'ends_on', 'description', 'is_active', 'status'])]
class FinanceRecurringPattern extends Model
{
    /** @use HasFactory<FinanceRecurringPatternFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<FinanceAccount, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }

    /**
     * @return BelongsTo<FinanceCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(FinanceCategory::class, 'category_id');
    }

    /**
     * @return BelongsTo<FinancePayee, $this>
     */
    public function payee(): BelongsTo
    {
        return $this->belongsTo(FinancePayee::class, 'payee_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'interval' => 'integer',
            'starts_on' => 'immutable_date',
            'next_occurrence_on' => 'immutable_date',
            'ends_on' => 'immutable_date',
            'is_active' => 'boolean',
        ];
    }
}
