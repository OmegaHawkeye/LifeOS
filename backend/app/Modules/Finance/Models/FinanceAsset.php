<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $owner_id
 * @property int|null $account_id
 * @property string $name
 * @property string $asset_type
 * @property string $currency
 * @property string|null $cost_basis
 * @property string|null $current_value
 * @property Carbon|null $current_valued_at
 * @property string|null $current_source
 * @property bool $include_in_net_worth
 * @property Carbon|null $archived_at
 */
#[Fillable(['owner_id', 'account_id', 'name', 'asset_type', 'currency', 'cost_basis', 'current_value', 'current_valued_at', 'current_source', 'include_in_net_worth', 'archived_at'])]
class FinanceAsset extends Model
{
    /** @return HasMany<FinanceAssetValuation, $this> */
    public function valuations(): HasMany
    {
        return $this->hasMany(FinanceAssetValuation::class, 'asset_id');
    }

    /** @return BelongsTo<FinanceAccount, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'cost_basis' => 'decimal:4',
            'current_value' => 'decimal:4',
            'current_valued_at' => 'immutable_date',
            'include_in_net_worth' => 'boolean',
            'archived_at' => 'immutable_datetime',
        ];
    }
}
