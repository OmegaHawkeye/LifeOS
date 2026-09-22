<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessWorkoutSessionExerciseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['exercise_id', 'exercise_name', 'position', 'target_sets', 'target_reps', 'target_weight', 'target_weight_unit', 'notes'])]
class FitnessWorkoutSessionExercise extends Model
{
    /** @use HasFactory<FitnessWorkoutSessionExerciseFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['target_weight' => 'decimal:2'];
    }

    /** @return FitnessWorkoutSessionExerciseFactory */
    protected static function newFactory(): Factory
    {
        return FitnessWorkoutSessionExerciseFactory::new();
    }

    /** @return BelongsTo<FitnessWorkoutSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(FitnessWorkoutSession::class, 'session_id');
    }

    /** @return BelongsTo<FitnessExercise, $this> */
    public function exercise(): BelongsTo
    {
        return $this->belongsTo(FitnessExercise::class);
    }

    /** @return HasMany<FitnessWorkoutSet, $this> */
    public function sets(): HasMany
    {
        return $this->hasMany(FitnessWorkoutSet::class, 'session_exercise_id')->orderBy('set_number');
    }
}
