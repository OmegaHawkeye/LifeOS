<?php

namespace App\Modules\Review\Application;

use App\Modules\Review\Models\WeeklyReview;

class GetWeeklyReviewEntry
{
    /** @return array{notes: string|null, next_week_focus: string|null, reviewed_at: string|null}|null */
    public function forOwner(int|string $ownerId, string $weekStart): ?array
    {
        $entry = WeeklyReview::query()
            ->where('owner_id', $ownerId)
            ->whereDate('week_start', $weekStart)
            ->first();

        if ($entry === null) {
            return null;
        }

        return [
            'notes' => $entry->notes,
            'next_week_focus' => $entry->next_week_focus,
            'reviewed_at' => $entry->reviewed_at?->toIso8601String(),
        ];
    }
}
