<?php

namespace App\Modules\Nutrition\Http\Requests;

use App\Modules\Nutrition\Http\Rules\MondayDate;
use Illuminate\Foundation\Http\FormRequest;

class CopyNutritionWeekRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'source_week_start' => ['required', 'date_format:Y-m-d', new MondayDate],
            'target_week_start' => ['required', 'date_format:Y-m-d', 'different:source_week_start', new MondayDate],
        ];
    }
}
