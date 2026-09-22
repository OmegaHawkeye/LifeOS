<?php

namespace App\Modules\Fitness\Models;

use Database\Factories\FitnessMonthlyReviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['review_month', 'reviewed_at', 'notes'])]
class FitnessMonthlyReview extends Model
{
    /** @use HasFactory<FitnessMonthlyReviewFactory> */
    use HasFactory;

    /** @return FitnessMonthlyReviewFactory */
    protected static function newFactory(): Factory
    {
        return FitnessMonthlyReviewFactory::new();
    }

    protected function casts(): array
    {
        return ['review_month' => 'immutable_date', 'reviewed_at' => 'immutable_datetime'];
    }
}
