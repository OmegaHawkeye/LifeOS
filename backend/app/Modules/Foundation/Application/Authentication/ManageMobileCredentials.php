<?php

namespace App\Modules\Foundation\Application\Authentication;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageMobileCredentials
{
    /**
     * @return array{access_token: string, access_token_expires_at: Carbon, refresh_token: string, refresh_token_expires_at: Carbon, token_type: string, device_name: string}
     */
    public function issue(User $owner, string $deviceName): array
    {
        return DB::transaction(fn (): array => $this->issuePair($owner, $deviceName));
    }

    /**
     * @return array{access_token: string, access_token_expires_at: Carbon, refresh_token: string, refresh_token_expires_at: Carbon, token_type: string, device_name: string}
     *
     * @throws ValidationException
     */
    public function rotate(string $plainRefreshToken): array
    {
        $result = DB::transaction(function () use ($plainRefreshToken): ?array {
            $refreshToken = DB::table('mobile_refresh_tokens')
                ->where('token_hash', hash('sha256', $plainRefreshToken))
                ->lockForUpdate()
                ->first();

            if ($refreshToken === null) {
                return null;
            }

            if ($refreshToken->consumed_at !== null) {
                $this->revokeFamily($refreshToken->family_id, (int) $refreshToken->user_id);

                return null;
            }

            if ($refreshToken->revoked_at !== null || Carbon::parse($refreshToken->expires_at)->isPast()) {
                $this->revokeFamily($refreshToken->family_id, (int) $refreshToken->user_id);

                return null;
            }

            $owner = User::query()->find($refreshToken->user_id);

            if (! $owner instanceof User) {
                return null;
            }

            DB::table('mobile_refresh_tokens')
                ->where('id', $refreshToken->id)
                ->update(['consumed_at' => now(), 'updated_at' => now()]);

            return $this->issuePair($owner, $refreshToken->device_name, $refreshToken->family_id);
        });

        if ($result === null) {
            throw ValidationException::withMessages([
                'refresh_token' => 'The refresh token is invalid, expired, or has already been used.',
            ]);
        }

        return $result;
    }

    public function revoke(string $plainRefreshToken): void
    {
        DB::transaction(function () use ($plainRefreshToken): void {
            $refreshToken = DB::table('mobile_refresh_tokens')
                ->where('token_hash', hash('sha256', $plainRefreshToken))
                ->lockForUpdate()
                ->first();

            if ($refreshToken !== null) {
                $this->revokeFamily($refreshToken->family_id, (int) $refreshToken->user_id);
            }
        });
    }

    /**
     * @return array{access_token: string, access_token_expires_at: Carbon, refresh_token: string, refresh_token_expires_at: Carbon, token_type: string, device_name: string}
     */
    private function issuePair(User $owner, string $deviceName, ?string $familyId = null): array
    {
        $familyId ??= (string) Str::uuid();
        $accessExpiresAt = now()->addMinutes((int) config('lifeos.mobile_access_token_minutes', 15));
        $refreshExpiresAt = now()->addDays((int) config('lifeos.mobile_refresh_token_days', 30));
        $plainRefreshToken = Str::random(80);
        $accessToken = $owner->createToken('mobile:'.$familyId, ['*'], $accessExpiresAt);

        DB::table('mobile_refresh_tokens')->insert([
            'user_id' => $owner->getKey(),
            'family_id' => $familyId,
            'device_name' => $deviceName,
            'token_hash' => hash('sha256', $plainRefreshToken),
            'expires_at' => $refreshExpiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'access_token' => $accessToken->plainTextToken,
            'access_token_expires_at' => $accessExpiresAt,
            'refresh_token' => $plainRefreshToken,
            'refresh_token_expires_at' => $refreshExpiresAt,
            'token_type' => 'Bearer',
            'device_name' => $deviceName,
        ];
    }

    private function revokeFamily(string $familyId, int $ownerId): void
    {
        DB::table('mobile_refresh_tokens')
            ->where('family_id', $familyId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'updated_at' => now()]);

        User::query()->whereKey($ownerId)->first()?->tokens()->where('name', 'mobile:'.$familyId)->delete();
    }
}
