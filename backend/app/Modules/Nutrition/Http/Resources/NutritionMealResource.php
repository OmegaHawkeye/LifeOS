<?php

namespace App\Modules\Nutrition\Http\Resources;

use App\Modules\Nutrition\Models\NutritionMeal;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionMeal */
class NutritionMealResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'recipe_id' => $this->recipe_id,
            'name' => $this->name,
            'meal_type' => $this->meal_type,
            'eaten_at' => CarbonImmutable::parse((string) $this->getRawOriginal('eaten_at'), 'UTC')->toISOString(),
            'servings' => $this->servings,
            'calories' => $this->calories,
            'protein_grams' => $this->protein_grams,
            'carbohydrate_grams' => $this->carbohydrate_grams,
            'fat_grams' => $this->fat_grams,
            'notes' => $this->notes,
        ];
    }
}
