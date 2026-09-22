<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessWorkoutSetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['set_number', 'reps', 'weight', 'weight_unit', 'rpe', 'duration_seconds', 'notes'])]
class FitnessWorkoutSet extends Model
{
    /** @use HasFactory<FitnessWorkoutSetFactory> */
    use HasFactory;

    /** @return FitnessWorkoutSetFactory */
    protected static function newFactory(): Factory
    {
        return FitnessWorkoutSetFactory::new();
    }

    protected function casts(): array
    {
        return ['weight' => 'decimal:2', 'rpe' => 'decimal:1'];
    }

    /** @return BelongsTo<FitnessWorkoutSessionExercise, $this> */
    public function sessionExercise(): BelongsTo
    {
        return $this->belongsTo(FitnessWorkoutSessionExercise::class, 'session_exercise_id');
    }
}
