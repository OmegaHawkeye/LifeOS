<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateFinanceTransactionRequest extends FormRequest
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
            'account_id' => ['sometimes', 'required', 'integer', 'min:1'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'type' => ['sometimes', 'required', Rule::in(['income', 'expense'])],
            'amount' => ['sometimes', 'required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'occurred_at' => ['sometimes', 'required', 'date'],
            'payee' => ['sometimes', 'nullable', 'string', 'max:120'],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['required', 'string', 'max:50', 'distinct:ignore_case'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->all() === []) {
                $validator->errors()->add('transaction', 'At least one editable field must be provided.');
            }

            foreach (array_diff(array_keys($this->all()), [
                'account_id', 'category_id', 'type', 'amount', 'description', 'occurred_at', 'payee', 'tags',
            ]) as $key) {
                $validator->errors()->add((string) $key, 'This transaction field cannot be changed.');
            }
        }];
    }
}
