<?php

namespace App\Modules\Routines\Http\Requests;

use App\Modules\Routines\Models\Routine;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoutineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'domain' => ['required', Rule::in(Routine::DOMAINS)],
            'frequency' => ['required', Rule::in(Routine::FREQUENCIES)],
            'days_of_week' => ['required_if:frequency,weekly', 'array', 'min:1', 'max:7'],
            'days_of_week.*' => ['integer', 'between:1,7', 'distinct'],
            'reminder_time' => ['nullable', 'date_format:H:i'],
        ];
    }
}
