<?php

namespace App\Modules\Review\Http\Controllers;

use App\Modules\Review\Application\SaveWeeklyReview;
use App\Modules\Review\Http\Requests\SaveWeeklyReviewRequest;
use App\Modules\Review\Http\Resources\WeeklyReviewEntryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class WeeklyReviewController
{
    public function __construct(private readonly SaveWeeklyReview $saveReview) {}

    public function update(SaveWeeklyReviewRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $weekStart = Carbon::parse($validated['week_start']);
        $ownerId = $request->user()->getAuthIdentifier();
        $entry = $this->saveReview->forOwner(
            $ownerId,
            $weekStart->toDateString(),
            $validated['notes'] ?? null,
            $validated['next_week_focus'] ?? null,
        );

        return (new WeeklyReviewEntryResource($entry))->response()->setStatusCode(200);
    }
}
