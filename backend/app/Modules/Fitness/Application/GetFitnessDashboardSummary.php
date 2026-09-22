<?php

namespace App\Modules\Fitness\Application;

use App\Modules\Fitness\Models\FitnessBodyMetric;
use App\Modules\Fitness\Models\FitnessGoal;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use stdClass;

class GetFitnessDashboardSummary
{
    /**
     * @return array{
     *     active_goals: list<array{id: int, metric_type: string, target_value: string, unit: string, target_date: string|null}>,
     *     measurement_trends: list<array{metric_type: string, unit: string, latest_value: string, change: string, direction: 'up'|'down'|'steady', points: list<array{date: string, value: string}>}>,
     *     weekly_workouts: array{planned: int, completed: int, missed: int, streak_days: int},
     *     personal_records: list<array{exercise_id: int, exercise_name: string, weight: string, weight_unit: string, reps: int|null, achieved_at: string|null}>,
     *     next_workout: array{id: int, name: string, scheduled_for: string|null, scheduled_days: list<int>}|null
     * }
     */
    public function forOwner(int|string $ownerId): array
    {
        $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();
        $activeSessionExists = FitnessWorkoutSession::query()
            ->where('owner_id', $ownerId)
            ->where('status', 'in_progress')
            ->exists();

        return [
            'active_goals' => $this->activeGoals($ownerId),
            'measurement_trends' => $this->measurementTrends($ownerId, $today),
            'weekly_workouts' => $this->weeklyWorkouts($ownerId, $today),
            'personal_records' => $this->personalRecords($ownerId),
            'next_workout' => $activeSessionExists ? null : $this->nextWorkout($ownerId, $today),
        ];
    }

    /** @return list<array{id: int, metric_type: string, target_value: string, unit: string, target_date: string|null}> */
    private function activeGoals(int|string $ownerId): array
    {
        return FitnessGoal::query()
            ->where('owner_id', $ownerId)
            ->where('status', 'active')
            ->orderBy('metric_type')
            ->orderBy('target_date')
            ->get()
            ->map(function (FitnessGoal $goal): array {
                $targetDate = $goal->getRawOriginal('target_date');

                return [
                    'id' => (int) $goal->getKey(),
                    'metric_type' => $goal->metric_type,
                    'target_value' => number_format((float) $goal->target_value, 4, '.', ''),
                    'unit' => $goal->unit,
                    'target_date' => is_string($targetDate) ? substr($targetDate, 0, 10) : null,
                ];
            })
            ->all();
    }

    /** @return list<array{metric_type: string, unit: string, latest_value: string, change: string, direction: 'up'|'down'|'steady', points: list<array{date: string, value: string}>}> */
    private function measurementTrends(int|string $ownerId, CarbonImmutable $today): array
    {
        $metrics = FitnessBodyMetric::query()
            ->where('owner_id', $ownerId)
            ->where('measured_at', '>=', $today->subDays(90))
            ->orderBy('measured_at')
            ->get();

        $trends = [];
        foreach ($metrics->groupBy(fn (FitnessBodyMetric $metric): string => $metric->metric_type.'|'.$metric->unit) as $measurements) {
            /** @var FitnessBodyMetric|null $first */
            $first = $measurements->first();
            /** @var FitnessBodyMetric|null $latest */
            $latest = $measurements->last();
            if ($first === null || $latest === null) {
                continue;
            }

            $change = (float) $latest->value - (float) $first->value;
            $direction = abs($change) < 0.00005 ? 'steady' : ($change < 0 ? 'down' : 'up');
            $points = $measurements->map(function (FitnessBodyMetric $metric): array {
                $measuredAt = $metric->getRawOriginal('measured_at');

                return [
                    'date' => is_string($measuredAt) ? substr($measuredAt, 0, 10) : '',
                    'value' => number_format((float) $metric->value, 4, '.', ''),
                ];
            })->values()->all();

            $trends[] = [
                'metric_type' => $latest->metric_type,
                'unit' => $latest->unit,
                'latest_value' => number_format((float) $latest->value, 4, '.', ''),
                'change' => number_format($change, 4, '.', ''),
                'direction' => $direction,
                'points' => $points,
            ];
        }

        usort($trends, fn (array $left, array $right): int => [$left['metric_type'], $left['unit']] <=> [$right['metric_type'], $right['unit']]);

        return $trends;
    }

    /** @return array{planned: int, completed: int, missed: int, streak_days: int} */
    private function weeklyWorkouts(int|string $ownerId, CarbonImmutable $today): array
    {
        $weekStart = $today->startOfWeek();
        $sessions = FitnessWorkoutSession::query()
            ->where('owner_id', $ownerId)
            ->where('status', 'completed')
            ->whereBetween('started_at', [$weekStart, $today->endOfDay()])
            ->get(['template_id', 'started_at']);

        $completedByTemplateAndDate = [];
        foreach ($sessions as $session) {
            if ($session->template_id !== null) {
                $completedByTemplateAndDate[$session->template_id.'|'.CarbonImmutable::parse($session->started_at)->toDateString()] = true;
            }
        }

        $templates = FitnessWorkoutTemplate::query()
            ->where('owner_id', $ownerId)
            ->whereNotNull('scheduled_days')
            ->get(['id', 'scheduled_days']);
        $plannedCount = 0;
        $missedCount = 0;
        for ($date = $weekStart; $date->lessThanOrEqualTo($today); $date = $date->addDay()) {
            $isoWeekday = $date->dayOfWeekIso;
            foreach ($templates as $template) {
                if (! in_array($isoWeekday, $template->scheduled_days ?? [], true)) {
                    continue;
                }

                $plannedCount++;
                if ($date->lessThan($today)
                    && ! isset($completedByTemplateAndDate[$template->getKey().'|'.$date->toDateString()])) {
                    $missedCount++;
                }
            }
        }

        return [
            'planned' => $plannedCount,
            'completed' => $sessions->count(),
            'missed' => $missedCount,
            'streak_days' => $this->streakDays($ownerId, $today),
        ];
    }

    private function streakDays(int|string $ownerId, CarbonImmutable $today): int
    {
        $sessions = FitnessWorkoutSession::query()
            ->where('owner_id', $ownerId)
            ->where('status', 'completed')
            ->orderByDesc('started_at')
            ->limit(366)
            ->get(['started_at']);
        $workoutDates = [];
        foreach ($sessions as $session) {
            $workoutDates[CarbonImmutable::parse($session->started_at)->toDateString()] = true;
        }

        $date = isset($workoutDates[$today->toDateString()]) ? $today : $today->subDay();
        $streakDays = 0;
        while (isset($workoutDates[$date->toDateString()])) {
            $streakDays++;
            $date = $date->subDay();
        }

        return $streakDays;
    }

    /** @return list<array{exercise_id: int, exercise_name: string, weight: string, weight_unit: string, reps: int|null, achieved_at: string|null}> */
    private function personalRecords(int|string $ownerId): array
    {
        /** @var Collection<int, stdClass> $sets */
        $sets = DB::table('fitness_workout_sets')
            ->join('fitness_workout_session_exercises', 'fitness_workout_session_exercises.id', '=', 'fitness_workout_sets.session_exercise_id')
            ->join('fitness_workout_sessions', 'fitness_workout_sessions.id', '=', 'fitness_workout_session_exercises.session_id')
            ->where('fitness_workout_sessions.owner_id', $ownerId)
            ->where('fitness_workout_sessions.status', 'completed')
            ->whereNotNull('fitness_workout_sets.weight')
            ->whereNotNull('fitness_workout_sets.weight_unit')
            ->orderBy('fitness_workout_session_exercises.exercise_name')
            ->orderBy('fitness_workout_sets.weight_unit')
            ->orderByDesc('fitness_workout_sets.weight')
            ->orderByDesc('fitness_workout_sessions.completed_at')
            ->select([
                'fitness_workout_session_exercises.exercise_id',
                'fitness_workout_session_exercises.exercise_name',
                'fitness_workout_sets.weight',
                'fitness_workout_sets.weight_unit',
                'fitness_workout_sets.reps',
                'fitness_workout_sessions.completed_at',
            ])
            ->get();

        $recordsByExerciseAndUnit = [];
        foreach ($sets as $set) {
            $key = $set->exercise_id.'|'.$set->weight_unit;
            if (isset($recordsByExerciseAndUnit[$key])) {
                continue;
            }

            $recordsByExerciseAndUnit[$key] = [
                'exercise_id' => (int) $set->exercise_id,
                'exercise_name' => (string) $set->exercise_name,
                'weight' => (string) $set->weight,
                'weight_unit' => (string) $set->weight_unit,
                'reps' => $set->reps === null ? null : (int) $set->reps,
                'achieved_at' => $set->completed_at === null ? null : substr((string) $set->completed_at, 0, 10),
            ];
        }

        return array_values($recordsByExerciseAndUnit);
    }

    /** @return array{id: int, name: string, scheduled_for: string|null, scheduled_days: list<int>}|null */
    private function nextWorkout(int|string $ownerId, CarbonImmutable $today): ?array
    {
        $templates = FitnessWorkoutTemplate::query()
            ->where('owner_id', $ownerId)
            ->orderBy('name')
            ->get(['id', 'name', 'scheduled_days']);
        if ($templates->isEmpty()) {
            return null;
        }

        $completedSessionKeys = FitnessWorkoutSession::query()
            ->where('owner_id', $ownerId)
            ->where('status', 'completed')
            ->whereBetween('started_at', [$today, $today->addDays(13)->endOfDay()])
            ->whereNotNull('template_id')
            ->get(['template_id', 'started_at'])
            ->mapWithKeys(fn (FitnessWorkoutSession $session): array => [
                $session->template_id.'|'.CarbonImmutable::parse($session->started_at)->toDateString() => true,
            ]);

        for ($daysFromToday = 0; $daysFromToday < 14; $daysFromToday++) {
            $date = $today->addDays($daysFromToday);
            foreach ($templates as $template) {
                if (! in_array($date->dayOfWeekIso, $template->scheduled_days ?? [], true)) {
                    continue;
                }
                if ($completedSessionKeys->has($template->getKey().'|'.$date->toDateString())) {
                    continue;
                }

                return [
                    'id' => (int) $template->getKey(),
                    'name' => $template->name,
                    'scheduled_for' => $date->toDateString(),
                    'scheduled_days' => $template->scheduled_days ?? [],
                ];
            }
        }

        $unscheduledTemplate = $templates->first(fn (FitnessWorkoutTemplate $template): bool => empty($template->scheduled_days));
        if ($unscheduledTemplate === null) {
            return null;
        }

        return [
            'id' => (int) $unscheduledTemplate->getKey(),
            'name' => $unscheduledTemplate->name,
            'scheduled_for' => null,
            'scheduled_days' => [],
        ];
    }
}
