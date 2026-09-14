<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFinanceTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'from_account_id' => ['required', 'integer', 'min:1', 'different:to_account_id'],
            'to_account_id' => ['required', 'integer', 'min:1', 'different:from_account_id'],
            'from_amount' => ['required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'to_amount' => ['sometimes', 'required', 'decimal:0,4', 'gt:0', 'between:0,999999999999999'],
            'occurred_at' => ['required', 'date'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
