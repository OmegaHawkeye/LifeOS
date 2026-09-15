<?php

namespace App\Modules\Finance\Http\Requests;

use App\Modules\Finance\Models\FinanceBudget;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFinanceBudgetRequest extends FormRequest
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
            'category_id' => ['sometimes', 'required', 'integer', 'min:1'],
            'month' => ['sometimes', 'required', 'date_format:Y-m'],
            'currency' => ['sometimes', 'required', 'regex:/^[A-Z]{3}$/'],
            'target_amount' => ['sometimes', 'required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->all() === []) {
                $validator->errors()->add('budget', 'At least one editable field must be provided.');
            }

            foreach (array_diff(array_keys($this->all()), ['category_id', 'month', 'currency', 'target_amount']) as $key) {
                $validator->errors()->add((string) $key, 'This budget field cannot be changed.');
            }

            if ($validator->errors()->hasAny(['category_id', 'month', 'currency'])) {
                return;
            }

            $budget = FinanceBudget::query()
                ->where('owner_id', $this->user()->getAuthIdentifier())
                ->findOrFail($this->route('budget'));
            $categoryId = $this->input('category_id', $budget->category_id);
            $month = $this->input('month', substr((string) $budget->month, 0, 7)).'-01';
            $currency = $this->input('currency', $budget->currency);
            $duplicateExists = FinanceBudget::query()
                ->where('owner_id', $this->user()->getAuthIdentifier())
                ->where('category_id', $categoryId)
                ->where('month', $month)
                ->where('currency', $currency)
                ->whereKeyNot($budget->id)
                ->exists();

            if ($duplicateExists) {
                $validator->errors()->add('category_id', 'A budget already exists for this category, month, and currency.');
            }
        }];
    }
}
