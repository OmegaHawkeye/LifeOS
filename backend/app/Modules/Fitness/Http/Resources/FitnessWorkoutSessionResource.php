<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessWorkoutSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessWorkoutSession */
class FitnessWorkoutSessionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'template_id' => $this->template_id,
            'name' => $this->name,
            'status' => $this->status,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'duration_minutes' => $this->duration_minutes,
            'notes' => $this->notes,
            'template' => new FitnessWorkoutTemplateResource($this->whenLoaded('template')),
            'exercises' => FitnessWorkoutSessionExerciseResource::collection($this->whenLoaded('exercises')),
        ];
    }
}
