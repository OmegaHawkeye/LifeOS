<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessWorkoutSet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessWorkoutSet */
class FitnessWorkoutSetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'set_number' => $this->set_number,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'weight_unit' => $this->weight_unit,
            'rpe' => $this->rpe,
            'duration_seconds' => $this->duration_seconds,
            'notes' => $this->notes,
        ];
    }
}
