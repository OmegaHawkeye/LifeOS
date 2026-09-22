<?php

namespace App\Modules\Fitness\Http\Controllers;

use App\Modules\Fitness\Application\GetFitnessDashboardSummary;
use App\Modules\Fitness\Http\Resources\FitnessDashboardSummaryResource;
use Illuminate\Http\Request;

class FitnessDashboardController
{
    public function show(Request $request, GetFitnessDashboardSummary $summary): FitnessDashboardSummaryResource
    {
        return new FitnessDashboardSummaryResource(
            $summary->forOwner($request->user()->getAuthIdentifier()),
        );
    }
}
