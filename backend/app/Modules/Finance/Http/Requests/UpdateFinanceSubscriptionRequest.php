<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateFinanceSubscriptionRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'amount' => ['sometimes', 'required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'billing_cycle' => ['sometimes', 'required', Rule::in(['monthly', 'quarterly', 'yearly'])],
            'next_renewal_on' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'status' => ['sometimes', 'required', Rule::in(['active', 'paused', 'canceled'])],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->all() === []) {
                $validator->errors()->add('subscription', 'At least one editable field must be provided.');
            }

            foreach (array_diff(array_keys($this->all()), [
                'account_id', 'category_id', 'name', 'amount', 'billing_cycle', 'next_renewal_on', 'status',
            ]) as $key) {
                $validator->errors()->add((string) $key, 'This subscription field cannot be changed.');
            }
        }];
    }
}
