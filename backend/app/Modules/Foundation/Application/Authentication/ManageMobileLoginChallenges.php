<?php

namespace App\Modules\Foundation\Application\Authentication;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageMobileLoginChallenges
{
    private const int CHALLENGE_MINUTES = 5;

    private const int MAX_ATTEMPTS = 5;

    public function cancel(string $plainToken): void
    {
        DB::table('mobile_login_challenges')
            ->where('token_hash', hash('sha256', $plainToken))
            ->delete();
    }

    /**
     * @return array{challenge_token: string, challenge_expires_at: Carbon}
     */
    public function begin(User $owner, string $deviceName, bool $setupRequired = false): array
    {
        DB::table('mobile_login_challenges')->where('expires_at', '<=', now())->delete();

        $plainToken = Str::random(80);
        $expiresAt = now()->addMinutes(self::CHALLENGE_MINUTES);

        DB::table('mobile_login_challenges')->insert([
            'user_id' => $owner->getKey(),
            'device_name' => $deviceName,
            'token_hash' => hash('sha256', $plainToken),
            'attempts' => 0,
            'setup_required' => $setupRequired,
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'challenge_token' => $plainToken,
            'challenge_expires_at' => $expiresAt,
        ];
    }

    /**
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public function complete(
        string $plainToken,
        string $code,
        OwnerSecondFactor $secondFactor,
        ManageMobileCredentials $credentials,
    ): array {
        $result = DB::transaction(function () use ($plainToken, $code, $secondFactor, $credentials): array {
            $challenge = DB::table('mobile_login_challenges')
                ->where('token_hash', hash('sha256', $plainToken))
                ->lockForUpdate()
                ->first();

            if ($challenge === null || Carbon::parse($challenge->expires_at)->isPast()) {
                if ($challenge !== null) {
                    DB::table('mobile_login_challenges')->where('id', $challenge->id)->delete();
                }

                return ['status' => 'invalid_challenge'];
            }

            if ((int) $challenge->attempts >= self::MAX_ATTEMPTS) {
                DB::table('mobile_login_challenges')->where('id', $challenge->id)->delete();

                return ['status' => 'invalid_challenge'];
            }

            $owner = User::query()->find($challenge->user_id);

            if (! $owner instanceof User) {
                DB::table('mobile_login_challenges')->where('id', $challenge->id)->delete();

                return ['status' => 'invalid_challenge'];
            }

            try {
                if ((bool) $challenge->setup_required) {
                    $secondFactor->confirmSetup($owner, $code);
                } else {
                    $secondFactor->verifyChallenge($owner, $code);
                }
            } catch (ValidationException) {
                $attempts = (int) $challenge->attempts + 1;

                if ($attempts >= self::MAX_ATTEMPTS) {
                    DB::table('mobile_login_challenges')->where('id', $challenge->id)->delete();
                } else {
                    DB::table('mobile_login_challenges')
                        ->where('id', $challenge->id)
                        ->update(['attempts' => $attempts, 'updated_at' => now()]);
                }

                return ['status' => 'invalid_code'];
            }

            DB::table('mobile_login_challenges')->where('id', $challenge->id)->delete();

            return [
                'status' => 'completed',
                'credentials' => $credentials->issue($owner, $challenge->device_name),
            ];
        });

        if ($result['status'] === 'invalid_code') {
            throw ValidationException::withMessages([
                'code' => 'The authenticator code is incorrect or expired.',
            ]);
        }

        if ($result['status'] !== 'completed') {
            throw ValidationException::withMessages([
                'challenge_token' => 'The sign-in challenge is invalid or expired. Start again with your email and password.',
            ]);
        }

        return $result['credentials'];
    }
}
