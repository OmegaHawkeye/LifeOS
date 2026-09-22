<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessProgressPhotoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['body_metric_id', 'photo_date', 'angle', 'tags', 'notes', 'storage_path', 'mime_type', 'file_size'])]
class FitnessProgressPhoto extends Model
{
    /** @use HasFactory<FitnessProgressPhotoFactory> */
    use HasFactory;

    /** @return FitnessProgressPhotoFactory */
    protected static function newFactory(): Factory
    {
        return FitnessProgressPhotoFactory::new();
    }

    protected function casts(): array
    {
        return ['photo_date' => 'immutable_date', 'tags' => 'array'];
    }

    /** @return BelongsTo<FitnessBodyMetric, $this> */
    public function bodyMetric(): BelongsTo
    {
        return $this->belongsTo(FitnessBodyMetric::class);
    }
}
