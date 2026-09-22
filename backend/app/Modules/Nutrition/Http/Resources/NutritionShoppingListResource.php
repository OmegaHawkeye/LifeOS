<?php

namespace App\Modules\Nutrition\Http\Resources;

use App\Modules\Nutrition\Models\NutritionShoppingList;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionShoppingList */
class NutritionShoppingListResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'unavailable_recipe_count' => $this->unavailable_recipe_count,
            'items' => NutritionShoppingItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
