<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessWorkoutSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'status', 'started_at', 'completed_at', 'duration_minutes', 'notes'])]
class FitnessWorkoutSession extends Model
{
    /** @use HasFactory<FitnessWorkoutSessionFactory> */
    use HasFactory;

    /** @return FitnessWorkoutSessionFactory */
    protected static function newFactory(): Factory
    {
        return FitnessWorkoutSessionFactory::new();
    }

    protected function casts(): array
    {
        return [
            'started_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<FitnessWorkoutTemplate, $this> */
    public function template(): BelongsTo
    {
        return $this->belongsTo(FitnessWorkoutTemplate::class, 'template_id');
    }

    /** @return HasMany<FitnessWorkoutSessionExercise, $this> */
    public function exercises(): HasMany
    {
        return $this->hasMany(FitnessWorkoutSessionExercise::class, 'session_id')->orderBy('position');
    }
}
