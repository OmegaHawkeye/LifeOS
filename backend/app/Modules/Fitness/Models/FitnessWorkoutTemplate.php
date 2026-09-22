<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessWorkoutTemplateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'scheduled_days', 'notes'])]
class FitnessWorkoutTemplate extends Model
{
    /** @use HasFactory<FitnessWorkoutTemplateFactory> */
    use HasFactory;

    /** @return FitnessWorkoutTemplateFactory */
    protected static function newFactory(): Factory
    {
        return FitnessWorkoutTemplateFactory::new();
    }

    /** @return HasMany<FitnessWorkoutTemplateExercise, $this> */
    public function exercises(): HasMany
    {
        return $this->hasMany(FitnessWorkoutTemplateExercise::class, 'template_id')->orderBy('position');
    }

    /** @return HasMany<FitnessWorkoutSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(FitnessWorkoutSession::class, 'template_id');
    }

    protected function casts(): array
    {
        return ['scheduled_days' => 'array'];
    }
}
