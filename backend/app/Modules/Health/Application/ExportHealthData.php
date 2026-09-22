<?php

namespace App\Modules\Health\Application;

use App\Modules\Health\Models\HealthSample;
use App\Modules\Health\Models\HealthSource;
use App\Modules\Health\Models\HealthSyncRun;
use Illuminate\Support\Arr;

class ExportHealthData
{
    /** @return array<string, array<int, array<string, mixed>>> */
    public function forOwner(int|string $ownerId): array
    {
        $syncRuns = HealthSyncRun::query()
            ->where('owner_id', $ownerId)
            ->orderBy('id')
            ->get()
            ->map(fn (HealthSyncRun $run): array => Arr::only($run->toArray(), [
                'id', 'source_id', 'status', 'imported_count', 'skipped_count', 'failed_count',
                'started_at', 'finished_at', 'created_at', 'updated_at',
            ]))
            ->all();

        return [
            'sources' => HealthSource::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'sync_runs' => $syncRuns,
            'samples' => HealthSample::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
        ];
    }
}
