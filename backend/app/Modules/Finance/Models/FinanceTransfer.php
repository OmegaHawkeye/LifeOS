<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceTransferFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['from_amount', 'from_currency', 'to_amount', 'to_currency', 'description', 'occurred_at'])]
class FinanceTransfer extends Model
{
    /** @use HasFactory<FinanceTransferFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<FinanceAccount, $this>
     */
    public function sourceAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'from_account_id');
    }

    /**
     * @return BelongsTo<FinanceAccount, $this>
     */
    public function destinationAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'to_account_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_amount' => 'decimal:4',
            'to_amount' => 'decimal:4',
            'occurred_at' => 'immutable_datetime',
        ];
    }
}
