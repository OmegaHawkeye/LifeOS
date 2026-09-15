<?php

namespace App\Modules\Health\Http\Controllers;

use App\Modules\Health\Application\ManageHealthData;
use App\Modules\Health\Http\Resources\HealthSampleResource;
use App\Modules\Health\Http\Resources\HealthSourceResource;
use App\Modules\Health\Http\Resources\HealthSyncRunResource;
use App\Modules\Health\Models\HealthSource;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HealthController
{
    public function __construct(private readonly ManageHealthData $health) {}

    public function sources(Request $request): Response
    {
        $sources = HealthSource::query()->where('owner_id', $request->user()->getAuthIdentifier())->get();

        return HealthSourceResource::collection($sources)->response();
    }

    public function storeSource(Request $request): Response
    {
        $data = $request->validate(['key' => 'required|string|max:80', 'name' => 'required|string|max:120', 'kind' => 'required|string|max:32', 'metadata' => 'sometimes|array']);
        $source = $this->health->source($request->user()->getAuthIdentifier(), $data);

        return (new HealthSourceResource($source))->response()->setStatusCode(201);
    }

    public function startRun(Request $request): Response
    {
        $data = $request->validate(['source_id' => 'required|integer|min:1']);

        return (new HealthSyncRunResource($this->health->startRun($request->user()->getAuthIdentifier(), $data)))->response()->setStatusCode(201);
    }

    public function finishRun(Request $request, int $run): HealthSyncRunResource
    {
        $data = $request->validate(['status' => 'required|in:success,partial_success,failure', 'imported_count' => 'sometimes|integer|min:0', 'skipped_count' => 'sometimes|integer|min:0', 'failed_count' => 'sometimes|integer|min:0', 'error_summary' => 'sometimes|array']);

        return new HealthSyncRunResource($this->health->finishRun($request->user()->getAuthIdentifier(), $run, $data));
    }

    public function samples(Request $request): Response
    {
        return HealthSampleResource::collection($this->health->samples($request->user()->getAuthIdentifier(), $request->query('sample_type')))->response();
    }

    public function storeSample(Request $request): Response
    {
        $data = $request->validate(['source_id' => 'required|integer|min:1', 'sync_run_id' => 'sometimes|nullable|integer|min:1', 'external_id' => 'required_unless:is_manual,true|nullable|string|max:255', 'sample_type' => 'required|in:steps,sleep,heart_rate,workouts,calories,weight', 'value' => 'required|numeric', 'unit' => 'required|string|max:32', 'recorded_at' => 'required|date', 'ended_at' => 'sometimes|nullable|date', 'confidence' => 'sometimes|nullable|numeric|between:0,1', 'metadata' => 'sometimes|array', 'is_manual' => 'sometimes|boolean']);
        $result = $this->health->ingest($request->user()->getAuthIdentifier(), $data);
        $response = (new HealthSampleResource($result['sample']))->response();
        if ($result['idempotent']) {
            $response->header('X-Idempotent', 'true')->setData(['data' => $result['sample'], 'meta' => ['idempotent' => true]]);
        }

        return $response->setStatusCode($result['idempotent'] ? 200 : 201);
    }
}
