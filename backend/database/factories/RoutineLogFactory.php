<?php

namespace Database\Factories;

use App\Modules\Routines\Models\Routine;
use App\Modules\Routines\Models\RoutineLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoutineLog>
 */
class RoutineLogFactory extends Factory
{
    protected $model = RoutineLog::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => null,
            'routine_id' => Routine::factory(),
            'occurrence_on' => now()->toDateString(),
            'completed_at' => null,
            'snoozed_until' => null,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (RoutineLog $log): void {
            $log->owner_id = Routine::query()->findOrFail($log->routine_id)->owner_id;
        });
    }
}
