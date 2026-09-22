<?php

namespace App\Modules\Nutrition\Application;

use App\Modules\Nutrition\Models\NutritionTarget;

class ManageNutritionTargets
{
    public function forOwner(int|string $ownerId): NutritionTarget
    {
        return NutritionTarget::query()->firstOrCreate(['owner_id' => $ownerId]);
    }

    /** @param array<string, mixed> $data */
    public function update(int|string $ownerId, array $data): NutritionTarget
    {
        $target = $this->forOwner($ownerId);
        $target->update($data);

        return $target->refresh();
    }
}
