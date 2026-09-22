<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Modules\Dashboard\Application\GetWeeklyReviewSummary;
use App\Modules\Dashboard\Http\Resources\WeeklyReviewSummaryResource;
use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class WeeklyReviewController
{
    public function __construct(
        private readonly GetWeeklyReviewSummary $summary,
        private readonly ManageOwnerSettings $settings,
    ) {}

    public function show(Request $request): WeeklyReviewSummaryResource
    {
        $validated = $request->validate([
            'week_start' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $ownerId = $request->user()->getAuthIdentifier();
        $timezone = $this->settings->timezoneForOwnerId($ownerId);
        $currentWeek = Carbon::now($timezone)->startOfWeek(Carbon::MONDAY);
        $start = isset($validated['week_start'])
            ? Carbon::parse($validated['week_start'], $timezone)->startOfDay()
            : $currentWeek->copy()->subWeek();

        if (! $start->isMonday()) {
            throw ValidationException::withMessages(['week_start' => 'The week must start on a Monday.']);
        }

        return new WeeklyReviewSummaryResource($this->summary->forOwner($ownerId, $start));
    }
}
