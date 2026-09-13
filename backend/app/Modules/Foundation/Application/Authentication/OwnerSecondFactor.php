<?php

namespace App\Modules\Foundation\Application\Authentication;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class OwnerSecondFactor
{
    public function begin(User $owner): string
    {
        if ($owner->two_factor_secret === null) {
            $owner->forceFill(['two_factor_secret' => Totp::generateSecret()])->save();
        }

        return $owner->two_factor_secret;
    }

    /** @throws ValidationException */
    public function confirmSetup(User $owner, string $code): void
    {
        if ($owner->two_factor_confirmed_at !== null) {
            abort(409, 'Two-factor authentication is already configured.');
        }

        $this->assertValidCode($owner, $code);
        $owner->forceFill(['two_factor_confirmed_at' => now()])->save();
    }

    /** @throws ValidationException */
    public function verifyChallenge(User $owner, string $code): void
    {
        if ($owner->two_factor_confirmed_at === null) {
            abort(409, 'Two-factor setup must be completed before signing in.');
        }

        $this->assertValidCode($owner, $code);
    }

    /** @throws ValidationException */
    private function assertValidCode(User $owner, string $code): void
    {
        $secret = $owner->two_factor_secret;

        if ($secret === null || ! Totp::verify($secret, $code, now()->timestamp)) {
            throw ValidationException::withMessages([
                'code' => 'The authenticator code is incorrect or expired.',
            ]);
        }
    }
}
