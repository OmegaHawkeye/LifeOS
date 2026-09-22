<?php

namespace App\Modules\Nutrition\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNutritionTargetRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'calories' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'protein_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'carbohydrate_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'fat_grams' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
