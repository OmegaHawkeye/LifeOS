<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceAssetValuation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property FinanceAssetValuation $resource */
class FinanceAssetValuationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var FinanceAssetValuation $valuation */
        $valuation = $this->resource;

        return [
            'id' => $valuation->id,
            'value' => $valuation->value,
            'valued_at' => $valuation->valued_at->toDateString(),
            'source' => $valuation->source,
            'notes' => $valuation->notes,
        ];
    }
}
