<?php

namespace App\Modules\Nutrition\Http\Requests;

use App\Modules\Nutrition\Models\NutritionShoppingItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNutritionShoppingItemRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'quantity' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'unit' => ['sometimes', 'nullable', 'string', 'max:32'],
            'store_section' => ['sometimes', Rule::in(NutritionShoppingItem::STORE_SECTIONS)],
            'is_checked' => ['sometimes', 'boolean'],
        ];
    }
}
