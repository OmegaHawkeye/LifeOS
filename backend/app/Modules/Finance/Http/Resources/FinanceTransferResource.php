<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceTransfer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class FinanceTransferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinanceTransfer $transfer */
        $transfer = $this->resource;

        return [
            'id' => $transfer->id,
            'from_account_id' => $transfer->from_account_id,
            'to_account_id' => $transfer->to_account_id,
            'from_amount' => $transfer->from_amount,
            'from_currency' => $transfer->from_currency,
            'to_amount' => $transfer->to_amount,
            'to_currency' => $transfer->to_currency,
            'description' => $transfer->description,
            'occurred_at' => Carbon::parse($transfer->occurred_at)->toISOString(),
            'cash_flow_effect' => 'none',
        ];
    }
}
