<?php

namespace App\Modules\Health\Http\Resources;

use App\Modules\Health\Models\HealthSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthSourceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var HealthSource $source */
        $source = $this->resource;

        return ['id' => $source->id, 'key' => $source->key, 'name' => $source->name, 'kind' => $source->kind, 'metadata' => $source->metadata, 'revoked_at' => $source->getRawOriginal('revoked_at')];
    }
}
