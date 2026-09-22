<?php

namespace App\Modules\Review\Application;

use App\Modules\Review\Models\WeeklyReview;

class SaveWeeklyReview
{
    public function forOwner(int|string $ownerId, string $weekStart, ?string $notes, ?string $nextWeekFocus): WeeklyReview
    {
        return WeeklyReview::query()->updateOrCreate(
            ['owner_id' => $ownerId, 'week_start' => $weekStart],
            [
                'notes' => $notes,
                'next_week_focus' => $nextWeekFocus,
                'reviewed_at' => now(),
            ],
        );
    }
}
