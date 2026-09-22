<?php

namespace App\Modules\Foundation\Application\Authentication;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageMobilePasskeyLogin
{
    public function begin(string $state, string $codeChallenge): string
    {
        DB::table('mobile_passkey_login_challenges')->insert([
            'state_hash' => hash('sha256', $state),
            'code_challenge' => $codeChallenge,
            'expires_at' => now()->addMinutes(5),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return rtrim((string) config('lifeos.passkey_web_url'), '/')
            .'/login?mobile_passkey_state='.urlencode($state);
    }

    public function prepare(string $state, Request $request): void
    {
        $challenge = DB::table('mobile_passkey_login_challenges')
            ->where('state_hash', hash('sha256', $state))
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($challenge === null) {
            throw ValidationException::withMessages([
                'state' => 'The passkey sign-in request has expired. Start again.',
            ]);
        }

        $request->session()->put('mobile_passkey_login.state_hash', $challenge->state_hash);
        $request->session()->forget('mobile_passkey_login.verified_at');
    }

    public function complete(string $state, User $owner, Request $request): string
    {
        $session = $request->session();
        $sessionStateHash = $session->pull('mobile_passkey_login.state_hash');
        $verifiedAt = $session->pull('mobile_passkey_login.verified_at');

        if (! is_string($sessionStateHash)
            || ! hash_equals($sessionStateHash, hash('sha256', $state))
            || ! is_numeric($verifiedAt)
            || (int) $verifiedAt < now()->subMinute()->timestamp
        ) {
            throw ValidationException::withMessages([
                'state' => 'Complete the passkey verification before continuing.',
            ]);
        }

        $code = Str::random(64);
        $updated = DB::table('mobile_passkey_login_challenges')
            ->where('state_hash', $sessionStateHash)
            ->whereNull('user_id')
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update([
                'user_id' => $owner->getKey(),
                'exchange_code_hash' => hash('sha256', $code),
                'updated_at' => now(),
            ]);

        if ($updated !== 1) {
            throw ValidationException::withMessages([
                'state' => 'The passkey sign-in request has expired or was already used.',
            ]);
        }

        return $code;
    }

    /**
     * @return array{access_token: string, access_token_expires_at: Carbon, refresh_token: string, refresh_token_expires_at: Carbon, token_type: string, device_name: string}
     *
     * @throws ValidationException
     */
    public function exchange(string $state, string $code, string $codeVerifier, ManageMobileCredentials $credentials): array
    {
        return DB::transaction(function () use ($state, $code, $codeVerifier, $credentials): array {
            $challenge = DB::table('mobile_passkey_login_challenges')
                ->where('state_hash', hash('sha256', $state))
                ->where('exchange_code_hash', hash('sha256', $code))
                ->lockForUpdate()
                ->first();

            $expectedChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

            if ($challenge === null
                || $challenge->consumed_at !== null
                || now()->greaterThan($challenge->expires_at)
                || ! hash_equals($challenge->code_challenge, $expectedChallenge)
            ) {
                throw ValidationException::withMessages([
                    'code' => 'The passkey sign-in code is invalid, expired, or already used.',
                ]);
            }

            $owner = User::query()->find($challenge->user_id);

            if (! $owner instanceof User) {
                throw ValidationException::withMessages([
                    'code' => 'The LifeOS account could not be found.',
                ]);
            }

            DB::table('mobile_passkey_login_challenges')
                ->where('id', $challenge->id)
                ->update(['consumed_at' => now(), 'updated_at' => now()]);

            return $credentials->issue($owner, 'LifeOS iOS device');
        });
    }
}
