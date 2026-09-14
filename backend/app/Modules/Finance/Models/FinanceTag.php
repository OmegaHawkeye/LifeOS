<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceTagFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'normalized_name', 'color', 'is_archived'])]
class FinanceTag extends Model
{
    /** @use HasFactory<FinanceTagFactory> */
    use HasFactory;

    /**
     * @return BelongsToMany<FinanceTransaction, $this>
     */
    public function transactions(): BelongsToMany
    {
        return $this->belongsToMany(FinanceTransaction::class, 'finance_transaction_tags', 'tag_id', 'transaction_id');
    }
}
