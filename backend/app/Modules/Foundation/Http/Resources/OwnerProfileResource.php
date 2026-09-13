<?php

namespace App\Modules\Foundation\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OwnerProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $owner */
        $owner = $this->resource;

        return [
            'id' => $owner->id,
            'name' => $owner->name,
            'email' => $owner->email,
        ];
    }
}
