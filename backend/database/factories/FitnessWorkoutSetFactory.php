<?php

namespace Database\Factories;

use App\Modules\Fitness\Models\FitnessWorkoutSessionExercise;
use App\Modules\Fitness\Models\FitnessWorkoutSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessWorkoutSet> */
class FitnessWorkoutSetFactory extends Factory
{
    protected $model = FitnessWorkoutSet::class;

    /** @return array{session_exercise_id: int|Factory<FitnessWorkoutSessionExercise>, set_number: int, reps: int, weight: string, rpe: string, duration_seconds: null, notes: null} */
    public function definition(): array
    {
        return [
            'session_exercise_id' => FitnessWorkoutSessionExercise::factory(),
            'set_number' => 1,
            'reps' => 8,
            'weight' => '60.00',
            'rpe' => '8.0',
            'duration_seconds' => null,
            'notes' => null,
        ];
    }
}
