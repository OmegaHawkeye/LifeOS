<?php

namespace App\Modules\Nutrition\Http\Requests;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class GenerateNutritionShoppingListRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'name' => ['sometimes', 'string', 'max:160'],
        ];
    }

    /** @return list<Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $start = $this->input('start_date');
            $end = $this->input('end_date');
            if (is_string($start) && is_string($end)
                && CarbonImmutable::canBeCreatedFromFormat($start, 'Y-m-d')
                && CarbonImmutable::canBeCreatedFromFormat($end, 'Y-m-d')
                && CarbonImmutable::parse($start)->diffInDays(CarbonImmutable::parse($end)) > 90) {
                $validator->errors()->add('end_date', 'The date range cannot exceed 90 days.');
            }
        }];
    }
}
