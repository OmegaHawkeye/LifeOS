<?php

namespace App\Modules\Nutrition\Http\Resources;

use App\Modules\Nutrition\Models\NutritionShoppingItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionShoppingItem */
class NutritionShoppingItemResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'quantity' => $this->quantity,
            'unit' => $this->unit,
            'store_section' => $this->store_section,
            'is_checked' => $this->is_checked,
            'is_manual' => $this->is_manual,
            'quantity_warning' => $this->quantity_warning,
        ];
    }
}
