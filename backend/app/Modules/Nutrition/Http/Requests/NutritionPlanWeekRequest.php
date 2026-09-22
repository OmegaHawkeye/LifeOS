<?php

namespace App\Modules\Nutrition\Http\Requests;

use App\Modules\Nutrition\Http\Rules\MondayDate;
use Illuminate\Foundation\Http\FormRequest;

class NutritionPlanWeekRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['week_start' => ['required', 'date_format:Y-m-d', new MondayDate]];
    }
}
