<?php

namespace App\Modules\Fitness\Http\Controllers;

use App\Modules\Fitness\Application\ManageFitnessWorkouts;
use App\Modules\Fitness\Http\Resources\FitnessExerciseResource;
use App\Modules\Fitness\Http\Resources\FitnessRecentPerformanceResource;
use App\Modules\Fitness\Http\Resources\FitnessWorkoutSessionResource;
use App\Modules\Fitness\Http\Resources\FitnessWorkoutSetResource;
use App\Modules\Fitness\Http\Resources\FitnessWorkoutTemplateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class FitnessWorkoutController
{
    public function __construct(private readonly ManageFitnessWorkouts $workouts) {}

    public function exercises(Request $request): AnonymousResourceCollection
    {
        return FitnessExerciseResource::collection(
            $this->workouts->exercises($request->user()->getAuthIdentifier()),
        );
    }

    public function storeExercise(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('fitness_exercises', 'name')
                    ->where('owner_id', $request->user()->getAuthIdentifier()),
            ],
            'muscle_group' => ['sometimes', 'nullable', 'string', 'max:60'],
            'equipment' => ['sometimes', 'nullable', 'string', 'max:60'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $exercise = $this->workouts->createExercise($request->user()->getAuthIdentifier(), $data);

        return (new FitnessExerciseResource($exercise))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function templates(Request $request): AnonymousResourceCollection
    {
        return FitnessWorkoutTemplateResource::collection(
            $this->workouts->templates($request->user()->getAuthIdentifier()),
        );
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'scheduled_days' => ['sometimes', 'nullable', 'array', 'max:7'],
            'scheduled_days.*' => ['integer', 'between:1,7', 'distinct'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'exercises' => ['required', 'array', 'min:1'],
            'exercises.*.exercise_id' => ['required', 'integer', 'min:1'],
            'exercises.*.position' => ['sometimes', 'integer', 'min:0', 'distinct'],
            'exercises.*.target_sets' => ['sometimes', 'nullable', 'integer', 'between:1,50'],
            'exercises.*.target_reps' => ['sometimes', 'nullable', 'string', 'max:20'],
            'exercises.*.target_weight' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'exercises.*.target_weight_unit' => ['sometimes', 'required_with:exercises.*.target_weight', 'in:kg,lb'],
            'exercises.*.notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $template = $this->workouts->createTemplate($request->user()->getAuthIdentifier(), $data);

        return (new FitnessWorkoutTemplateResource($template))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function sessions(Request $request): AnonymousResourceCollection
    {
        return FitnessWorkoutSessionResource::collection(
            $this->workouts->sessions($request->user()->getAuthIdentifier()),
        );
    }

    public function startSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'template_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'name' => ['required_without:template_id', 'nullable', 'string', 'max:100'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $session = $this->workouts->startSession($request->user()->getAuthIdentifier(), $data);

        return (new FitnessWorkoutSessionResource($session))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function addExercise(Request $request, int $session): JsonResponse
    {
        $data = $request->validate([
            'exercise_id' => ['required', 'integer', 'min:1'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $sessionExercise = $this->workouts->addExercise(
            $request->user()->getAuthIdentifier(),
            $session,
            $data['exercise_id'],
            $data['notes'] ?? null,
        );

        return (new FitnessWorkoutSessionResource($sessionExercise->session()->with('template', 'exercises.exercise', 'exercises.sets')->firstOrFail()))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function addSet(Request $request, int $session, int $exercise): JsonResponse
    {
        $data = $request->validate([
            'reps' => ['required_without:duration_seconds', 'nullable', 'integer', 'between:1,999'],
            'weight' => ['sometimes', 'nullable', 'numeric', 'between:0,10000'],
            'weight_unit' => ['sometimes', 'required_with:weight', 'in:kg,lb'],
            'rpe' => ['sometimes', 'nullable', 'numeric', 'between:1,10'],
            'duration_seconds' => ['required_without:reps', 'nullable', 'integer', 'between:1,86400'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $set = $this->workouts->logSet($request->user()->getAuthIdentifier(), $session, $exercise, $data);

        return (new FitnessWorkoutSetResource($set))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function completeSession(Request $request, int $session): JsonResponse
    {
        $completed = $this->workouts->completeSession($request->user()->getAuthIdentifier(), $session);

        return (new FitnessWorkoutSessionResource($completed))->response();
    }

    public function recentPerformance(Request $request, int $exercise): JsonResponse
    {
        $performance = $this->workouts->recentPerformance($request->user()->getAuthIdentifier(), $exercise);

        return (new FitnessRecentPerformanceResource($performance))->response();
    }
}
