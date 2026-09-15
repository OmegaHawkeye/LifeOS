<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceRecurringPattern;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinanceSubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinanceRecurringPattern $subscription */
        $subscription = $this->resource;

        return [
            'id' => $subscription->id,
            'name' => $subscription->description,
            'account_id' => $subscription->account_id,
            'account_name' => $subscription->account?->name,
            'category_id' => $subscription->category_id,
            'category_name' => $subscription->category?->name,
            'amount' => $subscription->amount,
            'currency' => $subscription->currency,
            'billing_cycle' => $subscription->frequency,
            'next_renewal_on' => substr((string) $subscription->getRawOriginal('next_occurrence_on'), 0, 10),
            'status' => $subscription->status,
        ];
    }
}
