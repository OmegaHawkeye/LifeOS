<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class FinanceTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinanceTransaction $transaction */
        $transaction = $this->resource;

        return [
            'id' => $transaction->id,
            'account_id' => $transaction->account_id,
            'type' => $transaction->type,
            'amount' => $transaction->amount,
            'currency' => $transaction->currency,
            'description' => $transaction->description,
            'occurred_at' => Carbon::parse($transaction->occurred_at)->toISOString(),
            'category' => $transaction->category === null ? null : [
                'id' => $transaction->category->id,
                'name' => $transaction->category->name,
                'type' => $transaction->category->type,
            ],
            'payee' => $transaction->payee?->name,
            'tags' => $transaction->tags->map(fn ($tag): string => $tag->name)->values(),
        ];
    }
}
