<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceTransactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['type', 'amount', 'currency', 'description', 'occurred_at'])]
class FinanceTransaction extends Model
{
    /** @use HasFactory<FinanceTransactionFactory> */
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
     * @return BelongsToMany<FinanceTag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(FinanceTag::class, 'finance_transaction_tags', 'transaction_id', 'tag_id');
    }

    /**
     * @return HasOne<FinanceImportReference, $this>
     */
    public function importReference(): HasOne
    {
        return $this->hasOne(FinanceImportReference::class, 'transaction_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'occurred_at' => 'immutable_datetime',
        ];
    }
}
