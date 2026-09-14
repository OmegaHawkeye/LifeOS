<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\FinanceOverview;
use App\Modules\Finance\Http\Requests\FinanceOverviewRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class FinanceOverviewController
{
    public function __construct(private readonly FinanceOverview $overview) {}

    public function show(FinanceOverviewRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $month = $filters['month'] ?? Carbon::now()->format('Y-m');

        return response()->json([
            'data' => $this->overview->forOwner(
                $request->user()->getAuthIdentifier(),
                $month,
                isset($filters['account_id']) ? (int) $filters['account_id'] : null,
            ),
        ]);
    }
}
