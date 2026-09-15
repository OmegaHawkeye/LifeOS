<?php

namespace App\Modules\Health\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['source_id', 'status', 'cursor', 'imported_count', 'skipped_count', 'failed_count', 'error_summary', 'started_at', 'finished_at'])]
class HealthSyncRun extends Model
{
    protected function casts(): array
    {
        return ['error_summary' => 'array', 'started_at' => 'immutable_datetime', 'finished_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<HealthSource, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(HealthSource::class, 'source_id');
    }
}
