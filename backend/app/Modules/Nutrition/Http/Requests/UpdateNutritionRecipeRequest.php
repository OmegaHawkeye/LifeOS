<?php

namespace App\Modules\Nutrition\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNutritionRecipeRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'dietary_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'servings' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'instructions' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'calories' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'protein_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'carbohydrate_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'fat_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'micronutrients' => ['sometimes', 'nullable', 'array'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:48'],
            'ingredients' => ['sometimes', 'array', 'min:1'],
            'ingredients.*.name' => ['required', 'string', 'max:160', 'distinct'],
            'ingredients.*.quantity' => ['required', 'numeric', 'gt:0'],
            'ingredients.*.unit' => ['required', 'string', 'max:32'],
        ];
    }
}
