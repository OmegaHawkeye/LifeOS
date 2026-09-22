<?php

namespace App\Modules\Nutrition\Http\Resources;

use App\Modules\Nutrition\Models\NutritionPlanItem;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionPlanItem */
class NutritionPlanItemResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $servings = (float) $this->servings;
        $recipe = $this->recipe;

        return [
            'id' => $this->id,
            'recipe_id' => $this->recipe_id,
            'recipe_name' => $this->recipe_name,
            'plan_date' => CarbonImmutable::parse($this->plan_date)->toDateString(),
            'meal_slot' => $this->meal_slot,
            'servings' => $this->servings,
            'status' => $this->status,
            'notes' => $this->notes,
            'calories' => $recipe?->calories === null ? null : number_format((float) $recipe->calories * $servings, 2, '.', ''),
            'protein_grams' => $recipe?->protein_grams === null ? null : number_format((float) $recipe->protein_grams * $servings, 2, '.', ''),
            'carbohydrate_grams' => $recipe?->carbohydrate_grams === null ? null : number_format((float) $recipe->carbohydrate_grams * $servings, 2, '.', ''),
            'fat_grams' => $recipe?->fat_grams === null ? null : number_format((float) $recipe->fat_grams * $servings, 2, '.', ''),
        ];
    }
}
