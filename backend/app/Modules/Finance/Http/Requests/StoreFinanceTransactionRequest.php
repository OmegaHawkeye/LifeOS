<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinanceTransactionRequest extends FormRequest
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
            'account_id' => ['required', 'integer', 'min:1'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'type' => ['required', Rule::in(['income', 'expense'])],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'occurred_at' => ['required', 'date'],
            'payee' => ['sometimes', 'nullable', 'string', 'max:120'],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['required', 'string', 'max:50', 'distinct:ignore_case'],
        ];
    }
}
