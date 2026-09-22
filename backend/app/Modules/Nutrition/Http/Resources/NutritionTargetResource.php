<?php

namespace App\Modules\Nutrition\Http\Resources;

use App\Modules\Nutrition\Models\NutritionTarget;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionTarget */
class NutritionTargetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'calories' => $this->calories,
            'protein_grams' => $this->protein_grams,
            'carbohydrate_grams' => $this->carbohydrate_grams,
            'fat_grams' => $this->fat_grams,
            'notes' => $this->notes,
        ];
    }
}
