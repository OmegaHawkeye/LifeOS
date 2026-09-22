<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessGoal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessGoal */
class FitnessGoalResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $targetDate = $this->getRawOriginal('target_date');

        return [
            'id' => $this->id,
            'metric_type' => $this->metric_type,
            'target_value' => $this->target_value,
            'unit' => $this->unit,
            'start_value' => $this->start_value,
            'target_date' => is_string($targetDate) ? substr($targetDate, 0, 10) : null,
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
