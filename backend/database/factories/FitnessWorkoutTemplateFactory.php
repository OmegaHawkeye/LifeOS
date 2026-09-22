<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessWorkoutTemplate> */
class FitnessWorkoutTemplateFactory extends Factory
{
    protected $model = FitnessWorkoutTemplate::class;

    /** @return array{owner_id: int|Factory<User>, name: string, scheduled_days: array<int, int>, notes: null} */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => 'Strength workout',
            'scheduled_days' => [1, 4],
            'notes' => null,
        ];
    }
}
