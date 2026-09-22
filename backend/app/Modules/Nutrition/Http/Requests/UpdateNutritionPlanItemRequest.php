<?php

namespace App\Modules\Nutrition\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNutritionPlanItemRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'recipe_id' => ['sometimes', 'required', 'integer', 'min:1'],
            'plan_date' => ['sometimes', 'date_format:Y-m-d'],
            'meal_slot' => ['sometimes', 'in:breakfast,lunch,dinner,snack'],
            'servings' => ['sometimes', 'numeric', 'gt:0', 'max:100'],
            'status' => ['sometimes', 'in:planned,prepped,eaten,skipped,replaced'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
