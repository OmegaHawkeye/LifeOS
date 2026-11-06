<?php

namespace App\Modules\Foundation\Application\Authentication;

use App\Models\User;
use App\Modules\Foundation\Models\OwnerSettings;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CreateInitialOwner
{
    /**
     * @param  array{name: string, email: string, password: string}  $attributes
     */
    public function create(array $attributes): ?User
    {
        return Cache::lock('lifeos:initial-owner-provisioning', 15)
            ->block(5, function () use ($attributes): ?User {
                return DB::transaction(function () use ($attributes): ?User {
                    if (User::query()->exists()) {
                        return null;
                    }

                    $owner = User::query()->create($attributes);
                    $owner->settings()->create(OwnerSettings::defaults());

                    return $owner;
                });
            });
    }
}
