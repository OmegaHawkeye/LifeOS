<?php

namespace App\Modules\Fitness\Http\Controllers;

use App\Modules\Fitness\Http\Resources\FitnessBodyMetricResource;
use App\Modules\Fitness\Http\Resources\FitnessGoalResource;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use App\Modules\Fitness\Models\FitnessGoal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FitnessController
{
    public function metrics(Request $request): AnonymousResourceCollection
    {
        $query = FitnessBodyMetric::query()->where('owner_id', $request->user()->getAuthIdentifier());
        if ($request->filled('metric_type')) {
            $query->where('metric_type', $request->string('metric_type')->toString());
        }
        if ($request->filled('days')) {
            $query->where('measured_at', '>=', now()->subDays($request->integer('days')));
        }

        return FitnessBodyMetricResource::collection($query->orderByDesc('measured_at')->get());
    }

    public function storeMetric(Request $request): JsonResponse
    {
        $data = $request->validate([
            'metric_type' => ['required', 'string', 'max:40'],
            'value' => ['required', 'numeric'],
            'unit' => ['required', 'string', 'max:24'],
            'measured_at' => ['required', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $metric = new FitnessBodyMetric($data);
        $metric->owner_id = $request->user()->getAuthIdentifier();
        $metric->source = 'manual';
        $metric->save();

        return (new FitnessBodyMetricResource($metric))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function goals(Request $request): AnonymousResourceCollection
    {
        return FitnessGoalResource::collection(
            FitnessGoal::query()->where('owner_id', $request->user()->getAuthIdentifier())->latest()->get(),
        );
    }

    public function storeGoal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'metric_type' => ['required', 'string', 'max:40'],
            'target_value' => ['required', 'numeric'],
            'unit' => ['required', 'string', 'max:24'],
            'start_value' => ['sometimes', 'nullable', 'numeric'],
            'target_date' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'in:active,paused,completed,abandoned'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        $goal = new FitnessGoal($data);
        $goal->owner_id = $request->user()->getAuthIdentifier();
        $goal->status ??= 'active';
        $goal->save();

        return (new FitnessGoalResource($goal))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function updateGoal(Request $request, int $goal): JsonResponse
    {
        $model = FitnessGoal::query()->where('owner_id', $request->user()->getAuthIdentifier())->findOrFail($goal);
        $model->update($request->validate(['target_value' => ['sometimes', 'numeric'], 'target_date' => ['sometimes', 'nullable', 'date'], 'status' => ['sometimes', 'in:active,paused,completed,abandoned'], 'notes' => ['sometimes', 'nullable', 'string']]));

        return (new FitnessGoalResource($model->refresh()))->response();
    }
}
