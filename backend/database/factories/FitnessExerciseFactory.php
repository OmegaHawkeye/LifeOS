<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessExercise;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessExercise> */
class FitnessExerciseFactory extends Factory
{
    protected $model = FitnessExercise::class;

    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->words(2, true),
            'muscle_group' => 'legs',
            'equipment' => 'barbell',
            'notes' => null,
        ];
    }
}
