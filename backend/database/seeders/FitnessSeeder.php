<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use App\Modules\Fitness\Models\FitnessExercise;
use App\Modules\Fitness\Models\FitnessGoal;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Illuminate\Database\Seeder;

class FitnessSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::query()->first();
        if ($owner === null) {
            return;
        }

        FitnessBodyMetric::query()->firstOrCreate([
            'owner_id' => $owner->getKey(),
            'metric_type' => 'weight',
            'measured_at' => now()->startOfDay(),
            'source' => 'manual',
            'external_id' => null,
        ], [
            'value' => '78.5000',
            'unit' => 'kg',
            'notes' => 'Example measurement',
        ]);

        FitnessGoal::query()->firstOrCreate([
            'owner_id' => $owner->getKey(),
            'metric_type' => 'weight',
            'status' => 'active',
        ], [
            'target_value' => '75.0000',
            'unit' => 'kg',
            'start_value' => '80.0000',
            'target_date' => now()->addMonths(6)->toDateString(),
            'notes' => 'Example fitness goal',
        ]);

        $exercise = FitnessExercise::query()->firstOrCreate([
            'owner_id' => $owner->getKey(),
            'name' => 'Barbell squat',
        ], [
            'muscle_group' => 'legs',
            'equipment' => 'barbell',
        ]);
        $template = FitnessWorkoutTemplate::query()->firstOrCreate([
            'owner_id' => $owner->getKey(),
            'name' => 'Lower body A',
        ], [
            'scheduled_days' => [1, 4],
            'notes' => 'Example reusable workout',
        ]);
        $template->exercises()->firstOrCreate([
            'position' => 0,
        ], [
            'exercise_id' => $exercise->getKey(),
            'target_sets' => 3,
            'target_reps' => '8-10',
            'target_weight' => '60.00',
        ]);
    }
}
