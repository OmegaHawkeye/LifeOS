<?php

namespace App\Modules\Routines\Http\Resources;

use App\Modules\Routines\Models\Routine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Routine $resource */
class RoutineDefinitionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var Routine $routine */
        $routine = $this->resource;

        return [
            'id' => $routine->id,
            'title' => $routine->title,
            'domain' => $routine->domain,
            'frequency' => $routine->frequency,
            'days_of_week' => $routine->frequency === 'weekly' ? $routine->days_of_week : null,
            'reminder_time' => $routine->reminder_time,
            'is_active' => $routine->is_active,
        ];
    }
}
