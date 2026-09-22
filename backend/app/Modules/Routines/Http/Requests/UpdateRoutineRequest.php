<?php

namespace App\Modules\Routines\Http\Requests;

use App\Modules\Routines\Models\Routine;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoutineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:120'],
            'domain' => ['sometimes', 'required', Rule::in(Routine::DOMAINS)],
            'frequency' => ['sometimes', 'required', Rule::in(Routine::FREQUENCIES)],
            'days_of_week' => ['required_if:frequency,weekly', 'nullable', 'array', 'min:1', 'max:7'],
            'days_of_week.*' => ['integer', 'between:1,7', 'distinct'],
            'reminder_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ];
    }
}
