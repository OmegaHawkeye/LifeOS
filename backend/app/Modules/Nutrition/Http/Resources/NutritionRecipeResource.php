<?php

namespace App\Modules\Nutrition\Http\Resources;

use App\Modules\Nutrition\Models\NutritionRecipe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionRecipe */
class NutritionRecipeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'dietary_notes' => $this->dietary_notes,
            'servings' => $this->servings,
            'instructions' => $this->instructions,
            'calories' => $this->calories,
            'protein_grams' => $this->protein_grams,
            'carbohydrate_grams' => $this->carbohydrate_grams,
            'fat_grams' => $this->fat_grams,
            'micronutrients' => $this->micronutrients,
            'tags' => $this->tags ?? [],
            'ingredients' => $this->whenLoaded('ingredients', fn (): array => $this->ingredients->map(fn ($ingredient): array => [
                'id' => $ingredient->id,
                'name' => $ingredient->name,
                'quantity' => $ingredient->pivot->getAttribute('quantity'),
                'unit' => $ingredient->pivot->getAttribute('unit'),
                'position' => $ingredient->pivot->getAttribute('position'),
            ])->all()),
        ];
    }
}
