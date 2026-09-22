<?php

namespace App\Modules\Review\Models;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Database\Factories\WeeklyReviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $owner_id
 * @property Carbon $week_start
 * @property string|null $notes
 * @property string|null $next_week_focus
 * @property CarbonImmutable|null $reviewed_at
 */
#[Fillable(['owner_id', 'week_start', 'notes', 'next_week_focus', 'reviewed_at'])]
class WeeklyReview extends Model
{
    /** @use HasFactory<WeeklyReviewFactory> */
    use HasFactory;

    /** @return WeeklyReviewFactory */
    protected static function newFactory(): Factory
    {
        return WeeklyReviewFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'week_start' => 'date:Y-m-d',
            'reviewed_at' => 'immutable_datetime',
        ];
    }
}
