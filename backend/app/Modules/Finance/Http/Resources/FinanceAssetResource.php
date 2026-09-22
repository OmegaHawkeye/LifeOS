<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceAsset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property FinanceAsset $resource */
class FinanceAssetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var FinanceAsset $asset */
        $asset = $this->resource;

        return [
            'id' => $asset->id,
            'name' => $asset->name,
            'asset_type' => $asset->asset_type,
            'account_id' => $asset->account_id,
            'account_name' => $asset->account?->name,
            'currency' => $asset->currency,
            'cost_basis' => $asset->cost_basis,
            'current_value' => $asset->current_value,
            'valued_at' => $asset->current_valued_at?->toDateString(),
            'source' => $asset->current_source,
            'include_in_net_worth' => $asset->include_in_net_worth,
            'is_archived' => $asset->archived_at !== null,
        ];
    }
}
