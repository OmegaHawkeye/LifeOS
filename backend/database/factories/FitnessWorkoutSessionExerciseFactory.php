<?php

namespace Database\Factories;

use App\Modules\Fitness\Models\FitnessExercise;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use App\Modules\Fitness\Models\FitnessWorkoutSessionExercise;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessWorkoutSessionExercise> */
class FitnessWorkoutSessionExerciseFactory extends Factory
{
    protected $model = FitnessWorkoutSessionExercise::class;

    /** @return array{session_id: int|Factory<FitnessWorkoutSession>, exercise_id: int|Factory<FitnessExercise>, exercise_name: string, position: int, notes: null} */
    public function definition(): array
    {
        return [
            'session_id' => FitnessWorkoutSession::factory(),
            'exercise_id' => FitnessExercise::factory(),
            'exercise_name' => 'Barbell squat',
            'position' => 0,
            'notes' => null,
        ];
    }
}
