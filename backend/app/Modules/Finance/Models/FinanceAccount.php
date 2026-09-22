<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceAccountFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property string|null $balance */
#[Fillable(['name', 'type', 'currency', 'opening_balance', 'include_in_net_worth'])]
class FinanceAccount extends Model
{
    /** @use HasFactory<FinanceAccountFactory> */
    use HasFactory;

    /**
     * @return HasMany<FinanceTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(FinanceTransaction::class, 'account_id');
    }

    /**
     * @return HasMany<FinanceTransfer, $this>
     */
    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(FinanceTransfer::class, 'from_account_id');
    }

    /**
     * @return HasMany<FinanceTransfer, $this>
     */
    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(FinanceTransfer::class, 'to_account_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'balance' => 'decimal:4',
            'opening_balance' => 'decimal:4',
            'is_archived' => 'boolean',
            'include_in_net_worth' => 'boolean',
        ];
    }
}
