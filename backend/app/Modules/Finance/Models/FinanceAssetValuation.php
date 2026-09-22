<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $owner_id
 * @property int $asset_id
 * @property string $value
 * @property Carbon $valued_at
 * @property string $source
 * @property string|null $notes
 */
#[Fillable(['owner_id', 'asset_id', 'value', 'valued_at', 'source', 'notes'])]
class FinanceAssetValuation extends Model
{
    /** @return BelongsTo<FinanceAsset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(FinanceAsset::class, 'asset_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'value' => 'decimal:4',
            'valued_at' => 'immutable_date',
        ];
    }
}
