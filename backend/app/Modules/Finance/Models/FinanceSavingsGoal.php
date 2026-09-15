<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceSavingsGoalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'target_amount', 'current_amount', 'currency', 'target_date'])]
class FinanceSavingsGoal extends Model
{
    /** @use HasFactory<FinanceSavingsGoalFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:4',
            'current_amount' => 'decimal:4',
            'target_date' => 'immutable_date',
        ];
    }
}
