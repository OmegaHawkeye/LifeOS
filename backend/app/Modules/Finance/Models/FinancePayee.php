<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinancePayeeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'normalized_name', 'is_archived'])]
class FinancePayee extends Model
{
    /** @use HasFactory<FinancePayeeFactory> */
    use HasFactory;

    /**
     * @return HasMany<FinanceTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(FinanceTransaction::class, 'payee_id');
    }
}
