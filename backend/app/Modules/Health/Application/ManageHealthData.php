<?php

namespace App\Modules\Health\Application;

use App\Modules\Health\Models\HealthSample;
use App\Modules\Health\Models\HealthSource;
use App\Modules\Health\Models\HealthSyncRun;
use Illuminate\Database\Eloquent\Collection;

class ManageHealthData
{
    /** @param array<string, mixed> $attributes */
    public function source(int|string $ownerId, array $attributes): HealthSource
    {
        $source = HealthSource::query()->where('owner_id', $ownerId)->where('key', $attributes['key'])->first();
        if ($source) {
            return $source;
        } $source = new HealthSource($attributes);
        $source->owner_id = $ownerId;
        $source->save();

        return $source;
    }

    /** @param array<string, mixed> $attributes */
    public function startRun(int|string $ownerId, array $attributes): HealthSyncRun
    {
        $source = $this->ownedSource($ownerId, (int) $attributes['source_id']);
        $run = new HealthSyncRun(['source_id' => $source->id, 'status' => 'running', 'started_at' => now()]);
        $run->owner_id = $ownerId;
        $run->save();

        return $run;
    }

    /** @param array<string, mixed> $attributes */
    public function finishRun(int|string $ownerId, int $id, array $attributes): HealthSyncRun
    {
        $run = HealthSyncRun::query()->where('owner_id', $ownerId)->findOrFail($id);
        $run->update([...$attributes, 'finished_at' => now()]);

        return $run->refresh();
    }

    /** @return Collection<int, HealthSample> */
    public function samples(int|string $ownerId, ?string $type = null): Collection
    {
        return HealthSample::query()->where('owner_id', $ownerId)->when($type, fn ($q) => $q->where('sample_type', $type))->orderByDesc('recorded_at')->get();
    }

    /** @return array{sample: HealthSample, idempotent: bool} */
    /**
     * @param  array<string, mixed>  $attributes
     * @return array{sample: HealthSample, idempotent: bool}
     */
    public function ingest(int|string $ownerId, array $attributes): array
    {
        $source = $this->ownedSource($ownerId, (int) $attributes['source_id']);
        $existing = isset($attributes['external_id']) ? HealthSample::query()->where('owner_id', $ownerId)->where('source_id', $source->id)->where('external_id', $attributes['external_id'])->first() : null;
        if ($existing) {
            return ['sample' => $existing, 'idempotent' => true];
        } $sample = new HealthSample($attributes);
        $sample->owner_id = $ownerId;
        $sample->is_manual = $attributes['is_manual'] ?? false;
        $sample->save();

        return ['sample' => $sample->refresh(), 'idempotent' => false];
    }

    private function ownedSource(int|string $ownerId, int $id): HealthSource
    {
        return HealthSource::query()->where('owner_id', $ownerId)->findOrFail($id);
    }
}
