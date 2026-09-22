<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessBodyMetric;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessBodyMetric */
class FitnessBodyMetricResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'metric_type' => $this->metric_type,
            'value' => $this->value,
            'unit' => $this->unit,
            'measured_at' => $this->measured_at,
            'notes' => $this->notes,
            'source' => $this->source,
            'external_id' => $this->external_id,
        ];
    }
}
