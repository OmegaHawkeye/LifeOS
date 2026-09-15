<?php

namespace App\Modules\Health\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['source_id', 'sync_run_id', 'external_id', 'sample_type', 'value', 'unit', 'recorded_at', 'ended_at', 'confidence', 'metadata', 'is_manual', 'conflict_status'])]
class HealthSample extends Model
{
    protected function casts(): array
    {
        return ['value' => 'decimal:4', 'confidence' => 'decimal:4', 'recorded_at' => 'immutable_datetime', 'ended_at' => 'immutable_datetime', 'metadata' => 'array', 'is_manual' => 'boolean'];
    }

    /** @return BelongsTo<HealthSource, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(HealthSource::class, 'source_id');
    }

    /** @return BelongsTo<HealthSyncRun, $this> */
    public function syncRun(): BelongsTo
    {
        return $this->belongsTo(HealthSyncRun::class, 'sync_run_id');
    }
}
