<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFinanceCategoryRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'color' => ['sometimes', 'nullable', 'regex:/^#[A-Fa-f0-9]{6}$/'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->all() === []) {
                $validator->errors()->add('category', 'At least one editable field must be provided.');
            }

            foreach (array_diff(array_keys($this->all()), ['name', 'color']) as $key) {
                $validator->errors()->add((string) $key, 'This category field cannot be changed.');
            }
        }];
    }
}
