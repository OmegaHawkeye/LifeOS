<?php

namespace App\Modules\Health\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['key', 'name', 'kind', 'metadata', 'revoked_at'])]
class HealthSource extends Model
{
    protected function casts(): array
    {
        return ['metadata' => 'array', 'revoked_at' => 'immutable_datetime'];
    }

    /** @return HasMany<HealthSample, $this> */
    public function samples(): HasMany
    {
        return $this->hasMany(HealthSample::class, 'source_id');
    }
}
