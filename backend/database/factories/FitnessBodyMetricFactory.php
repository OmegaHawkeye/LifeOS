<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessBodyMetric> */
class FitnessBodyMetricFactory extends Factory
{
    protected $model = FitnessBodyMetric::class;

    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'metric_type' => 'weight',
            'value' => '75.0000',
            'unit' => 'kg',
            'measured_at' => now(),
            'notes' => null,
            'source' => 'manual',
            'external_id' => null,
        ];
    }
}
