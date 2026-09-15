<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFinanceSavingsGoalRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'target_amount' => ['sometimes', 'required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'current_amount' => ['sometimes', 'required', 'decimal:0,4', 'gte:0', 'between:0,999999999999999'],
            'currency' => ['sometimes', 'required', 'regex:/^[A-Z]{3}$/'],
            'target_date' => ['sometimes', 'required', 'date_format:Y-m-d'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->all() === []) {
                $validator->errors()->add('goal', 'At least one editable field must be provided.');
            }

            foreach (array_diff(array_keys($this->all()), ['name', 'target_amount', 'current_amount', 'currency', 'target_date']) as $key) {
                $validator->errors()->add((string) $key, 'This savings goal field cannot be changed.');
            }
        }];
    }
}
