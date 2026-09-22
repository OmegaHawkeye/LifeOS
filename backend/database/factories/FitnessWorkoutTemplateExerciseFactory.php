<?php

namespace Database\Factories;

use App\Modules\Fitness\Models\FitnessExercise;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use App\Modules\Fitness\Models\FitnessWorkoutTemplateExercise;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessWorkoutTemplateExercise> */
class FitnessWorkoutTemplateExerciseFactory extends Factory
{
    protected $model = FitnessWorkoutTemplateExercise::class;

    /** @return array{template_id: int|Factory<FitnessWorkoutTemplate>, exercise_id: int|Factory<FitnessExercise>, position: int, target_sets: null, target_reps: null, target_weight: null, target_weight_unit: null, notes: null} */
    public function definition(): array
    {
        return [
            'template_id' => FitnessWorkoutTemplate::factory(),
            'exercise_id' => FitnessExercise::factory(),
            'position' => 0,
            'target_sets' => null,
            'target_reps' => null,
            'target_weight' => null,
            'target_weight_unit' => null,
            'notes' => null,
        ];
    }
}
