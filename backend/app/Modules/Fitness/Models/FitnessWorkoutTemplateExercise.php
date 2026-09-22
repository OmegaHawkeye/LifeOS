<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessWorkoutTemplateExerciseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['exercise_id', 'position', 'target_sets', 'target_reps', 'target_weight', 'target_weight_unit', 'notes'])]
class FitnessWorkoutTemplateExercise extends Model
{
    /** @use HasFactory<FitnessWorkoutTemplateExerciseFactory> */
    use HasFactory;

    /** @return FitnessWorkoutTemplateExerciseFactory */
    protected static function newFactory(): Factory
    {
        return FitnessWorkoutTemplateExerciseFactory::new();
    }

    protected function casts(): array
    {
        return ['target_weight' => 'decimal:2'];
    }

    /** @return BelongsTo<FitnessWorkoutTemplate, $this> */
    public function template(): BelongsTo
    {
        return $this->belongsTo(FitnessWorkoutTemplate::class, 'template_id');
    }

    /** @return BelongsTo<FitnessExercise, $this> */
    public function exercise(): BelongsTo
    {
        return $this->belongsTo(FitnessExercise::class);
    }
}
