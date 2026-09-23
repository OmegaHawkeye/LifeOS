<?php

namespace App\Modules\Foundation\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateOwnerSettingsRequest extends FormRequest
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
            'timezone' => ['sometimes', 'required', 'timezone'],
            'currency' => ['sometimes', 'required', 'regex:/^[A-Z]{3}$/'],
            'measurement_system' => ['sometimes', 'required', Rule::in(['metric', 'imperial'])],
            'theme' => ['sometimes', 'required', Rule::in(['system', 'light', 'dark'])],
            'mask_sensitive_data_by_default' => ['sometimes', 'required', 'boolean'],
            'notifications_enabled' => ['sometimes', 'required', 'boolean'],
            'passkeys_enabled' => ['sometimes', 'required', 'boolean'],
        ];
    }

    /**
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $allowedKeys = [
                'timezone',
                'currency',
                'measurement_system',
                'theme',
                'mask_sensitive_data_by_default',
                'notifications_enabled',
                'passkeys_enabled',
            ];
            $inputKeys = array_keys($this->all());

            if ($inputKeys === []) {
                $validator->errors()->add('settings', 'At least one setting must be provided.');
            }

            foreach (array_diff($inputKeys, $allowedKeys) as $key) {
                $validator->errors()->add((string) $key, 'This setting is not supported.');
            }
        }];
    }
}
