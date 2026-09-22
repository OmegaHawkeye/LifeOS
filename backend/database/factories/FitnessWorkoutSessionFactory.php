<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/** @extends Factory<FitnessWorkoutSession> */
class FitnessWorkoutSessionFactory extends Factory
{
    protected $model = FitnessWorkoutSession::class;

    /** @return array{owner_id: int|Factory<User>, name: string, status: string, started_at: Carbon, completed_at: null, duration_minutes: null, notes: null} */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => 'Strength workout',
            'status' => 'in_progress',
            'started_at' => now(),
            'completed_at' => null,
            'duration_minutes' => null,
            'notes' => null,
        ];
    }
}
