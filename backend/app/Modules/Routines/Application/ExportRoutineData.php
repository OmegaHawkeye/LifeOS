<?php

namespace App\Modules\Routines\Application;

use App\Modules\Routines\Models\Routine;
use App\Modules\Routines\Models\RoutineLog;

class ExportRoutineData
{
    /** @return array<string, array<int, array<string, mixed>>> */
    public function forOwner(int|string $ownerId): array
    {
        return [
            'routines' => Routine::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'routine_logs' => RoutineLog::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
        ];
    }
}
