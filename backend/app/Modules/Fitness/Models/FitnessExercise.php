<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessExerciseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'muscle_group', 'equipment', 'notes'])]
class FitnessExercise extends Model
{
    /** @use HasFactory<FitnessExerciseFactory> */
    use HasFactory;

    /** @return FitnessExerciseFactory */
    protected static function newFactory(): Factory
    {
        return FitnessExerciseFactory::new();
    }

    /** @return HasMany<FitnessWorkoutTemplateExercise, $this> */
    public function templateExercises(): HasMany
    {
        return $this->hasMany(FitnessWorkoutTemplateExercise::class, 'exercise_id');
    }

    /** @return HasMany<FitnessWorkoutSessionExercise, $this> */
    public function sessionExercises(): HasMany
    {
        return $this->hasMany(FitnessWorkoutSessionExercise::class, 'exercise_id');
    }
}
