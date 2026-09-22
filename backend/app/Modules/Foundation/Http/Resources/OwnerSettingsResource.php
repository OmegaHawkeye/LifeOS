<?php

namespace App\Modules\Foundation\Http\Resources;

use App\Modules\Foundation\Models\OwnerSettings;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OwnerSettingsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var OwnerSettings $settings */
        $settings = $this->resource;

        return [
            'timezone' => $settings->timezone,
            'currency' => $settings->currency,
            'measurement_system' => $settings->measurement_system,
            'theme' => $settings->theme,
            'mask_sensitive_data_by_default' => $settings->mask_sensitive_data_by_default,
            'notifications_enabled' => $settings->notifications_enabled,
        ];
    }
}
