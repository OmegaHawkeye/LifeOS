<?php

namespace App\Modules\Fitness\Application;

use App\Modules\Fitness\Models\FitnessExercise;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use App\Modules\Fitness\Models\FitnessWorkoutSessionExercise;
use App\Modules\Fitness\Models\FitnessWorkoutSet;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageFitnessWorkouts
{
    /** @return Collection<int, FitnessExercise> */
    public function exercises(int|string $ownerId): Collection
    {
        return FitnessExercise::query()->where('owner_id', $ownerId)->orderBy('name')->get();
    }

    /** @param array{name: string, muscle_group?: string|null, equipment?: string|null, notes?: string|null} $data */
    public function createExercise(int|string $ownerId, array $data): FitnessExercise
    {
        $exercise = new FitnessExercise($data);
        $exercise->owner_id = $ownerId;
        $exercise->save();

        return $exercise;
    }

    /** @return Collection<int, FitnessWorkoutTemplate> */
    public function templates(int|string $ownerId): Collection
    {
        return FitnessWorkoutTemplate::query()
            ->where('owner_id', $ownerId)
            ->with('exercises.exercise')
            ->orderBy('name')
            ->get();
    }

    /** @param array{name: string, scheduled_days?: array<int, int>|null, notes?: string|null, exercises: array<int, array{exercise_id: int, position?: int, target_sets?: int|null, target_reps?: string|null, target_weight?: int|float|string|null, target_weight_unit?: string|null, notes?: string|null}>} $data */
    public function createTemplate(int|string $ownerId, array $data): FitnessWorkoutTemplate
    {
        return DB::transaction(function () use ($ownerId, $data): FitnessWorkoutTemplate {
            $positions = collect($data['exercises'])
                ->map(fn (array $exercise, int $index): int => $exercise['position'] ?? $index);
            if ($positions->unique()->count() !== $positions->count()) {
                throw ValidationException::withMessages([
                    'exercises' => 'Each exercise in a template must have a unique position.',
                ]);
            }

            $exerciseIds = collect($data['exercises'])->pluck('exercise_id')->unique();
            $ownedExerciseCount = FitnessExercise::query()
                ->where('owner_id', $ownerId)
                ->whereIn('id', $exerciseIds)
                ->count();

            if ($ownedExerciseCount !== $exerciseIds->count()) {
                throw ValidationException::withMessages([
                    'exercises' => 'Every template exercise must belong to this owner.',
                ]);
            }

            $template = new FitnessWorkoutTemplate([
                'name' => $data['name'],
                'scheduled_days' => $data['scheduled_days'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
            $template->owner_id = $ownerId;
            $template->save();

            foreach ($data['exercises'] as $index => $exerciseData) {
                $template->exercises()->create([
                    'exercise_id' => $exerciseData['exercise_id'],
                    'position' => $exerciseData['position'] ?? $index,
                    'target_sets' => $exerciseData['target_sets'] ?? null,
                    'target_reps' => $exerciseData['target_reps'] ?? null,
                    'target_weight' => $exerciseData['target_weight'] ?? null,
                    'target_weight_unit' => $exerciseData['target_weight_unit'] ?? null,
                    'notes' => $exerciseData['notes'] ?? null,
                ]);
            }

            return $template->load('exercises.exercise');
        });
    }

    /** @param array{template_id?: int|null, name?: string, notes?: string|null} $data */
    public function startSession(int|string $ownerId, array $data): FitnessWorkoutSession
    {
        return DB::transaction(function () use ($ownerId, $data): FitnessWorkoutSession {
            $template = isset($data['template_id'])
                ? FitnessWorkoutTemplate::query()
                    ->where('owner_id', $ownerId)
                    ->with('exercises.exercise')
                    ->findOrFail($data['template_id'])
                : null;

            $session = new FitnessWorkoutSession([
                'name' => $data['name'] ?? $template?->name,
                'status' => 'in_progress',
                'started_at' => now(),
                'notes' => $data['notes'] ?? null,
            ]);
            $session->owner_id = $ownerId;
            $session->template_id = $template?->getKey();
            $session->save();

            if ($template !== null) {
                foreach ($template->exercises as $templateExercise) {
                    $session->exercises()->create([
                        'exercise_id' => $templateExercise->exercise_id,
                        'exercise_name' => $templateExercise->exercise->name,
                        'position' => $templateExercise->position,
                        'target_sets' => $templateExercise->target_sets,
                        'target_reps' => $templateExercise->target_reps,
                        'target_weight' => $templateExercise->target_weight,
                        'target_weight_unit' => $templateExercise->target_weight_unit,
                        'notes' => $templateExercise->notes,
                    ]);
                }
            }

            return $session->load('template', 'exercises.exercise', 'exercises.sets');
        });
    }

    public function addExercise(int|string $ownerId, int $sessionId, int $exerciseId, ?string $notes = null): FitnessWorkoutSessionExercise
    {
        $session = $this->activeSession($ownerId, $sessionId);
        $exercise = FitnessExercise::query()->where('owner_id', $ownerId)->findOrFail($exerciseId);
        $lastPosition = $session->exercises()->max('position');

        return $session->exercises()->create([
            'exercise_id' => $exercise->getKey(),
            'exercise_name' => $exercise->name,
            'position' => $lastPosition === null ? 0 : (int) $lastPosition + 1,
            'notes' => $notes,
        ])->load('exercise', 'sets');
    }

    /** @param array{reps?: int|null, weight?: int|float|string|null, weight_unit?: string|null, rpe?: int|float|string|null, duration_seconds?: int|null, notes?: string|null} $data */
    public function logSet(int|string $ownerId, int $sessionId, int $sessionExerciseId, array $data): FitnessWorkoutSet
    {
        $session = $this->activeSession($ownerId, $sessionId);
        $sessionExercise = FitnessWorkoutSessionExercise::query()
            ->where('session_id', $session->getKey())
            ->findOrFail($sessionExerciseId);

        return $sessionExercise->sets()->create([
            'set_number' => (int) $sessionExercise->sets()->max('set_number') + 1,
            'reps' => $data['reps'] ?? null,
            'weight' => $data['weight'] ?? null,
            'weight_unit' => $data['weight_unit'] ?? null,
            'rpe' => $data['rpe'] ?? null,
            'duration_seconds' => $data['duration_seconds'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function completeSession(int|string $ownerId, int $sessionId): FitnessWorkoutSession
    {
        $session = $this->activeSession($ownerId, $sessionId)->load('exercises.sets');
        if ($session->exercises->isEmpty() || $session->exercises->every(fn (FitnessWorkoutSessionExercise $exercise): bool => $exercise->sets->isEmpty())) {
            throw ValidationException::withMessages([
                'session' => 'Log at least one set before completing this workout.',
            ]);
        }

        $completedAt = now();
        $session->status = 'completed';
        $session->completed_at = $completedAt;
        $startedAt = CarbonImmutable::parse((string) $session->getRawOriginal('started_at'));
        $session->duration_minutes = max(0, (int) $startedAt->diffInMinutes($completedAt));
        $session->save();

        return $session->load('template', 'exercises.exercise', 'exercises.sets');
    }

    /** @return array{session: FitnessWorkoutSession|null, exercise: FitnessExercise, sets: Collection<int, FitnessWorkoutSet>} */
    public function recentPerformance(int|string $ownerId, int $exerciseId): array
    {
        $exercise = FitnessExercise::query()->where('owner_id', $ownerId)->findOrFail($exerciseId);
        $previousExercise = FitnessWorkoutSessionExercise::query()
            ->where('exercise_id', $exercise->getKey())
            ->whereHas('session', fn ($query) => $query
                ->where('owner_id', $ownerId)
                ->where('status', 'completed'))
            ->with(['session', 'sets'])
            ->orderByDesc(FitnessWorkoutSession::query()
                ->select('completed_at')
                ->whereColumn('fitness_workout_sessions.id', 'fitness_workout_session_exercises.session_id'))
            ->first();

        if ($previousExercise === null) {
            return [
                'session' => null,
                'exercise' => $exercise,
                'sets' => new Collection,
            ];
        }

        return [
            'session' => $previousExercise->session,
            'exercise' => $exercise,
            'sets' => $previousExercise->sets,
        ];
    }

    /** @return Collection<int, FitnessWorkoutSession> */
    public function sessions(int|string $ownerId): Collection
    {
        return FitnessWorkoutSession::query()
            ->where('owner_id', $ownerId)
            ->with('template', 'exercises.exercise', 'exercises.sets')
            ->orderByDesc('started_at')
            ->limit(20)
            ->get();
    }

    private function activeSession(int|string $ownerId, int $sessionId): FitnessWorkoutSession
    {
        return FitnessWorkoutSession::query()
            ->where('owner_id', $ownerId)
            ->where('status', 'in_progress')
            ->findOrFail($sessionId);
    }
}
