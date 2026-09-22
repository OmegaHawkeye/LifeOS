<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreFinanceAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'asset_type' => ['required', Rule::in(['investment', 'collectible', 'game_item', 'property', 'vehicle', 'other'])],
            'account_id' => ['nullable', 'integer', Rule::exists('finance_accounts', 'id')->where('owner_id', $this->user()?->getAuthIdentifier())],
            'currency' => ['required', 'regex:/^[A-Z]{3}$/'],
            'cost_basis' => ['nullable', 'decimal:0,4', 'between:0,999999999999999'],
            'initial_value' => ['nullable', 'decimal:0,4', 'between:0,999999999999999'],
            'valued_at' => ['required_with:initial_value', 'date_format:Y-m-d'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $accountId = $this->input('account_id');
            $currency = $this->input('currency');

            if (! is_numeric($accountId) || ! is_string($currency) || ! preg_match('/^[A-Z]{3}$/', $currency)) {
                return;
            }

            $accountCurrency = DB::table('finance_accounts')
                ->where('id', (int) $accountId)
                ->where('owner_id', $this->user()?->getAuthIdentifier())
                ->value('currency');

            if ($accountCurrency !== null && $accountCurrency !== $currency) {
                $validator->errors()->add('account_id', 'The linked account must use the same currency as the asset.');
            }
        });
    }
}
