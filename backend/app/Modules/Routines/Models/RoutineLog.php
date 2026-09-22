<?php

namespace App\Modules\Routines\Models;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Database\Factories\RoutineLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $owner_id
 * @property int $routine_id
 * @property Carbon $occurrence_on
 * @property CarbonImmutable|null $completed_at
 * @property CarbonImmutable|null $snoozed_until
 */
#[Fillable(['owner_id', 'routine_id', 'occurrence_on', 'completed_at', 'snoozed_until'])]
class RoutineLog extends Model
{
    /** @use HasFactory<RoutineLogFactory> */
    use HasFactory;

    /** @return RoutineLogFactory */
    protected static function newFactory(): Factory
    {
        return RoutineLogFactory::new();
    }

    /** @return BelongsTo<Routine, $this> */
    public function routine(): BelongsTo
    {
        return $this->belongsTo(Routine::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'occurrence_on' => 'date:Y-m-d',
            'completed_at' => 'immutable_datetime',
            'snoozed_until' => 'immutable_datetime',
        ];
    }
}
