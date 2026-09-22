<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessGoalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['metric_type', 'target_value', 'unit', 'start_value', 'target_date', 'status', 'notes'])]
class FitnessGoal extends Model
{
    /** @use HasFactory<FitnessGoalFactory> */
    use HasFactory;

    /** @return FitnessGoalFactory */
    protected static function newFactory(): Factory
    {
        return FitnessGoalFactory::new();
    }

    protected function casts(): array
    {
        return ['target_value' => 'decimal:4', 'start_value' => 'decimal:4', 'target_date' => 'date'];
    }
}
