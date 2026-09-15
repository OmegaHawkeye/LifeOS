<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinanceBudgetRequest extends FormRequest
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
            'category_id' => [
                'required', 'integer', 'min:1',
                Rule::unique('finance_budgets')->where('owner_id', $this->user()->getAuthIdentifier())
                    ->where('month', $this->input('month').'-01')
                    ->where('currency', $this->input('currency')),
            ],
            'month' => ['required', 'date_format:Y-m'],
            'currency' => ['required', 'regex:/^[A-Z]{3}$/'],
            'target_amount' => ['required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
        ];
    }
}
