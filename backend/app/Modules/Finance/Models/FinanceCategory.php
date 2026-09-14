<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'type', 'color', 'is_archived'])]
class FinanceCategory extends Model
{
    /** @use HasFactory<FinanceCategoryFactory> */
    use HasFactory;

    /**
     * @return HasMany<FinanceTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(FinanceTransaction::class, 'category_id');
    }
}
