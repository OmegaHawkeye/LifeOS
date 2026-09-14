<?php

namespace App\Modules\Finance\Models;

use Database\Factories\FinanceImportReferenceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['provider', 'external_id', 'raw_metadata', 'imported_at'])]
class FinanceImportReference extends Model
{
    /** @use HasFactory<FinanceImportReferenceFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<FinanceTransaction, $this>
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(FinanceTransaction::class, 'transaction_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'raw_metadata' => 'array',
            'imported_at' => 'immutable_datetime',
        ];
    }
}
