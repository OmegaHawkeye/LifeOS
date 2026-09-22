<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessGoal;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessGoal> */
class FitnessGoalFactory extends Factory
{
    protected $model = FitnessGoal::class;

    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'metric_type' => 'weight',
            'target_value' => '70.0000',
            'unit' => 'kg',
            'start_value' => '80.0000',
            'target_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
            'notes' => null,
        ];
    }
}
