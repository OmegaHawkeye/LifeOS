<?php

namespace App\Modules\Nutrition\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNutritionMealRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'recipe_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'name' => ['required_without:recipe_id', 'string', 'max:160'],
            'meal_type' => ['required', 'in:breakfast,lunch,dinner,snack,other'],
            'eaten_at' => ['required', 'date'],
            'servings' => ['sometimes', 'numeric', 'gt:0', 'max:100'],
            'calories' => ['required_without:recipe_id', 'nullable', 'numeric', 'min:0'],
            'protein_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'carbohydrate_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'fat_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
