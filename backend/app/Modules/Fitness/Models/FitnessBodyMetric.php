<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessBodyMetricFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['metric_type', 'value', 'unit', 'measured_at', 'notes', 'source', 'external_id'])]
class FitnessBodyMetric extends Model
{
    /** @use HasFactory<FitnessBodyMetricFactory> */
    use HasFactory;

    /** @return FitnessBodyMetricFactory */
    protected static function newFactory(): Factory
    {
        return FitnessBodyMetricFactory::new();
    }

    protected function casts(): array
    {
        return ['value' => 'decimal:4', 'measured_at' => 'immutable_datetime'];
    }
}
