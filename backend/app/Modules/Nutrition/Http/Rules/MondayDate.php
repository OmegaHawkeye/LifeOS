<?php

namespace App\Modules\Nutrition\Http\Rules;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class MondayDate implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && CarbonImmutable::canBeCreatedFromFormat($value, 'Y-m-d') && ! CarbonImmutable::parse($value)->isMonday()) {
            $fail('The date must be a Monday.');
        }
    }
}
