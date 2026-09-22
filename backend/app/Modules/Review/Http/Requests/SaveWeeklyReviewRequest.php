<?php

namespace App\Modules\Review\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

class SaveWeeklyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'week_start' => ['required', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'next_week_focus' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $weekStart = $this->input('week_start');
            if (is_string($weekStart) && $validator->errors()->has('week_start') === false && ! Carbon::parse($weekStart)->isMonday()) {
                $validator->errors()->add('week_start', 'The week must start on a Monday.');
            }
        }];
    }
}
