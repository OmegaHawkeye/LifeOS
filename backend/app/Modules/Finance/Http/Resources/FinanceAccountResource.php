<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinanceAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinanceAccount $account */
        $account = $this->resource;

        return [
            'id' => $account->id,
            'name' => $account->name,
            'type' => $account->type,
            'currency' => $account->currency,
            'opening_balance' => $account->opening_balance,
            'balance' => $account->getAttribute('balance') ?? $account->opening_balance,
            'include_in_net_worth' => $account->include_in_net_worth,
        ];
    }
}
