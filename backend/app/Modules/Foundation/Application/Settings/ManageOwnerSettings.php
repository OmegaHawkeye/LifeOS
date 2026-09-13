<?php

namespace App\Modules\Foundation\Application\Settings;

use App\Models\User;
use App\Modules\Foundation\Models\OwnerSettings;

class ManageOwnerSettings
{
    public function forOwner(User $owner): OwnerSettings
    {
        return $owner->settings()->first() ?? new OwnerSettings(OwnerSettings::defaults());
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(User $owner, array $attributes): OwnerSettings
    {
        $settings = $owner->settings()->firstOrCreate([], OwnerSettings::defaults());
        $settings->update($attributes);

        return $settings->refresh();
    }
}
