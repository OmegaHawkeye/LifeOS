<?php

namespace App\Modules\Routines\Models;

use Database\Factories\RoutineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $owner_id
 * @property string $title
 * @property string $domain
 * @property string $frequency
 * @property array<int, int>|null $days_of_week
 * @property string|null $reminder_time
 * @property bool $is_active
 */
#[Fillable(['owner_id', 'title', 'domain', 'frequency', 'days_of_week', 'reminder_time', 'is_active'])]
class Routine extends Model
{
    /** @var list<string> */
    public const DOMAINS = ['finance', 'fitness', 'nutrition', 'review', 'personal'];

    /** @var list<string> */
    public const FREQUENCIES = ['daily', 'weekly'];

    /** @use HasFactory<RoutineFactory> */
    use HasFactory;

    /** @return RoutineFactory */
    protected static function newFactory(): Factory
    {
        return RoutineFactory::new();
    }

    /** @return HasMany<RoutineLog, $this> */
    public function logs(): HasMany
    {
        return $this->hasMany(RoutineLog::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'days_of_week' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
