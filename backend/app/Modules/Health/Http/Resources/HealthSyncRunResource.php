<?php

namespace App\Modules\Health\Http\Resources;

use App\Modules\Health\Models\HealthSyncRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthSyncRunResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var HealthSyncRun $run */
        $run = $this->resource;

        return ['id' => $run->id, 'source_id' => $run->source_id, 'status' => $run->status, 'imported_count' => $run->imported_count, 'skipped_count' => $run->skipped_count, 'failed_count' => $run->failed_count, 'error_summary' => $run->error_summary, 'started_at' => $run->getRawOriginal('started_at'), 'finished_at' => $run->getRawOriginal('finished_at')];
    }
}
