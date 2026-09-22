<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceAsset;
use App\Modules\Finance\Models\FinanceAssetValuation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ManageFinanceAssets
{
    /** @return Collection<int, FinanceAsset> */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceAsset::query()
            ->with('account:id,name')
            ->where('owner_id', $ownerId)
            ->whereNull('archived_at')
            ->orderBy('asset_type')
            ->orderBy('name')
            ->get();
    }

    /** @param array{name: string, asset_type: string, account_id?: int|null, currency: string, cost_basis?: string|null, initial_value?: string|null, valued_at?: string} $attributes */
    public function create(int|string $ownerId, array $attributes): FinanceAsset
    {
        return DB::transaction(function () use ($ownerId, $attributes): FinanceAsset {
            $asset = FinanceAsset::query()->create([
                'owner_id' => $ownerId,
                'account_id' => $attributes['account_id'] ?? null,
                'name' => $attributes['name'],
                'asset_type' => $attributes['asset_type'],
                'currency' => $attributes['currency'],
                'cost_basis' => $attributes['cost_basis'] ?? null,
                'include_in_net_worth' => true,
            ]);

            if (isset($attributes['initial_value'])) {
                $this->recordValuation($asset, $ownerId, $attributes['initial_value'], $attributes['valued_at'], null);
            }

            return $asset->refresh()->load('account:id,name');
        });
    }

    /** @param array{is_archived?: bool, include_in_net_worth?: bool} $attributes */
    public function update(int|string $ownerId, int $assetId, array $attributes): FinanceAsset
    {
        $asset = $this->ownedAsset($ownerId, $assetId, includeArchived: true);
        if (($attributes['is_archived'] ?? false) === true) {
            $asset->archived_at = now();
        } elseif (($attributes['is_archived'] ?? false) === false) {
            $asset->archived_at = null;
        }
        if (array_key_exists('include_in_net_worth', $attributes)) {
            $asset->include_in_net_worth = $attributes['include_in_net_worth'];
        }
        $asset->save();

        return $asset->refresh()->load('account:id,name');
    }

    public function addValuation(int|string $ownerId, int $assetId, string $value, string $valuedAt, ?string $notes): FinanceAssetValuation
    {
        $asset = $this->ownedAsset($ownerId, $assetId);

        return DB::transaction(fn (): FinanceAssetValuation => $this->recordValuation($asset, $ownerId, $value, $valuedAt, $notes));
    }

    /** @return Collection<int, FinanceAssetValuation> */
    public function valuationsForOwner(int|string $ownerId, int $assetId): Collection
    {
        $asset = $this->ownedAsset($ownerId, $assetId);

        return $asset->valuations()->orderByDesc('valued_at')->orderByDesc('id')->get();
    }

    private function ownedAsset(int|string $ownerId, int $assetId, bool $includeArchived = false): FinanceAsset
    {
        $query = FinanceAsset::query()->where('owner_id', $ownerId);
        if (! $includeArchived) {
            $query->whereNull('archived_at');
        }

        return $query->findOrFail($assetId);
    }

    private function recordValuation(FinanceAsset $asset, int|string $ownerId, string $value, string $valuedAt, ?string $notes): FinanceAssetValuation
    {
        $valuation = $asset->valuations()->create([
            'owner_id' => $ownerId,
            'value' => $value,
            'valued_at' => $valuedAt,
            'source' => 'manual',
            'notes' => $notes,
        ]);

        if ($asset->current_valued_at === null || Carbon::parse($valuedAt)->greaterThanOrEqualTo($asset->current_valued_at)) {
            $asset->current_value = $value;
            $asset->current_valued_at = Carbon::parse($valuedAt);
            $asset->current_source = 'manual';
            $asset->save();
        }

        return $valuation;
    }
}
