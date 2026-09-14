<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinanceAccountRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['checking', 'savings', 'credit_card', 'cash', 'investment', 'other'])],
            'currency' => ['sometimes', 'required', 'regex:/^[A-Z]{3}$/'],
            'opening_balance' => ['sometimes', 'required', 'decimal:0,4', 'between:-999999999999999,999999999999999'],
        ];
    }
}
