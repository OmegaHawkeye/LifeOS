<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessWorkoutTemplate */
class FitnessWorkoutTemplateResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'scheduled_days' => $this->scheduled_days ?? [],
            'notes' => $this->notes,
            'exercises' => FitnessWorkoutTemplateExerciseResource::collection($this->whenLoaded('exercises')),
        ];
    }
}
