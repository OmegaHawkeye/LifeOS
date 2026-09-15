<?php

namespace App\Modules\Health\Http\Resources;

use App\Modules\Health\Models\HealthSample;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthSampleResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var HealthSample $sample */
        $sample = $this->resource;

        return ['id' => $sample->id, 'source_id' => $sample->source_id, 'sync_run_id' => $sample->sync_run_id, 'external_id' => $sample->external_id, 'sample_type' => $sample->sample_type, 'value' => $sample->value, 'unit' => $sample->unit, 'recorded_at' => $sample->getRawOriginal('recorded_at'), 'ended_at' => $sample->getRawOriginal('ended_at'), 'confidence' => $sample->confidence, 'metadata' => $sample->metadata, 'is_manual' => $sample->is_manual, 'conflict_status' => $sample->conflict_status];
    }
}
