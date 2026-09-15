<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceSavingsGoal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class FinanceSavingsGoalResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var FinanceSavingsGoal $goal */
        $goal = $this->resource;
        $target = (float) $goal->target_amount;
        $current = (float) $goal->current_amount;
        $remaining = max(0, $target - $current);
        $targetDateValue = substr((string) $goal->getRawOriginal('target_date'), 0, 10);
        $targetDate = Carbon::createFromFormat('!Y-m-d', $targetDateValue, 'UTC');
        $months = max(1, now()->startOfMonth()->diffInMonths($targetDate->startOfMonth(), false));

        return [
            'id' => $goal->id,
            'name' => $goal->name,
            'target_amount' => $goal->target_amount,
            'current_amount' => $goal->current_amount,
            'currency' => $goal->currency,
            'target_date' => $targetDateValue,
            'progress_percent' => $target > 0 ? (int) round(min(100, $current / $target * 100)) : 0,
            'remaining_amount' => number_format($remaining, 4, '.', ''),
            'required_monthly_pace' => number_format($remaining / $months, 4, '.', ''),
        ];
    }
}
