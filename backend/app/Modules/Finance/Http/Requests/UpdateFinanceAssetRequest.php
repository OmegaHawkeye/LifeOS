<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFinanceAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'is_archived' => ['sometimes', 'required', 'boolean'],
            'include_in_net_worth' => ['sometimes', 'required', 'boolean'],
        ];
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->all() === []) {
                $validator->errors()->add('asset', 'At least one editable field must be provided.');
            }
            foreach (array_diff(array_keys($this->all()), ['is_archived', 'include_in_net_worth']) as $key) {
                $validator->errors()->add((string) $key, 'This asset field cannot be changed.');
            }
        }];
    }
}
