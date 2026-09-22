<?php

namespace App\Modules\Fitness\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FitnessRecentPerformanceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'session' => $this->resource['session'] === null ? null : [
                'id' => $this->resource['session']->id,
                'name' => $this->resource['session']->name,
                'completed_at' => $this->resource['session']->completed_at,
            ],
            'exercise' => new FitnessExerciseResource($this->resource['exercise']),
            'sets' => FitnessWorkoutSetResource::collection($this->resource['sets']),
        ];
    }
}
