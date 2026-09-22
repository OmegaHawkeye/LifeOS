<?php

namespace App\Modules\Fitness\Application;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GetWeeklyFitnessSummary
{
    /** @return array{completed_workouts: int, workout_minutes: int|null} */
    public function forOwner(int|string $ownerId, Carbon $start, Carbon $end): array
    {
        $workouts = DB::table('fitness_workout_sessions')
            ->where('owner_id', $ownerId)
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$start, $end]);

        $workoutCount = (int) $workouts->count();
        $durationCoverage = (clone $workouts)->whereNotNull('duration_minutes')->count();

        return [
            'completed_workouts' => $workoutCount,
            'workout_minutes' => $workoutCount > 0 && $durationCoverage < $workoutCount
                ? null
                : (int) (clone $workouts)->sum('duration_minutes'),
        ];
    }
}
