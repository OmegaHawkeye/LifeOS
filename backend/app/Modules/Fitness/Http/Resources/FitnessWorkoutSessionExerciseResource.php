<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessWorkoutSessionExercise;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessWorkoutSessionExercise */
class FitnessWorkoutSessionExerciseResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exercise_name' => $this->exercise_name,
            'position' => $this->position,
            'target_sets' => $this->target_sets,
            'target_reps' => $this->target_reps,
            'target_weight' => $this->target_weight,
            'target_weight_unit' => $this->target_weight_unit,
            'notes' => $this->notes,
            'exercise' => new FitnessExerciseResource($this->whenLoaded('exercise')),
            'sets' => FitnessWorkoutSetResource::collection($this->whenLoaded('sets')),
        ];
    }
}
