<?php

namespace App\Modules\Review\Http\Resources;

use App\Modules\Review\Models\WeeklyReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property WeeklyReview $resource */
class WeeklyReviewEntryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var WeeklyReview $review */
        $review = $this->resource;

        return [
            'week_start' => $review->week_start->toDateString(),
            'notes' => $review->notes,
            'next_week_focus' => $review->next_week_focus,
            'reviewed_at' => $review->reviewed_at?->toIso8601String(),
        ];
    }
}
