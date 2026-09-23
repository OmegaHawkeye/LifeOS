<?php

namespace App\Modules\Foundation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['timezone', 'currency', 'measurement_system', 'theme', 'mask_sensitive_data_by_default', 'notifications_enabled', 'passkeys_enabled'])]
#[Hidden(['user_id'])]
class OwnerSettings extends Model
{
    /**
     * @return array<string, string|bool>
     */
    public static function defaults(): array
    {
        return [
            'timezone' => config('app.timezone'),
            'currency' => 'EUR',
            'measurement_system' => 'metric',
            'theme' => 'system',
            'mask_sensitive_data_by_default' => true,
            'notifications_enabled' => false,
            'passkeys_enabled' => true,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mask_sensitive_data_by_default' => 'boolean',
            'notifications_enabled' => 'boolean',
            'passkeys_enabled' => 'boolean',
        ];
    }
}
