<?php

namespace App\Modules\Nutrition\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNutritionPlanItemRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'recipe_id' => ['required', 'integer', 'min:1'],
            'plan_date' => ['required', 'date_format:Y-m-d'],
            'meal_slot' => ['required', 'in:breakfast,lunch,dinner,snack'],
            'servings' => ['sometimes', 'numeric', 'gt:0', 'max:100'],
            'status' => ['sometimes', 'in:planned,prepped,eaten,skipped,replaced'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
