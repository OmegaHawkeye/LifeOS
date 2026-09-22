<?php

namespace App\Modules\Review\Application;

use App\Modules\Review\Models\WeeklyReview;

class ExportWeeklyReviews
{
    /** @return array<int, array<string, mixed>> */
    public function forOwner(int|string $ownerId): array
    {
        return WeeklyReview::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray();
    }
}
