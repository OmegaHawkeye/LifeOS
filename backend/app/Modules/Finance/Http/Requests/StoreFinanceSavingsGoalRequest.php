<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFinanceSavingsGoalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'target_amount' => ['required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'current_amount' => ['sometimes', 'numeric', 'decimal:0,4', 'gte:0', 'between:0,999999999999999'],
            'currency' => ['required', 'regex:/^[A-Z]{3}$/'],
            'target_date' => ['required', 'date_format:Y-m-d'],
        ];
    }
}
