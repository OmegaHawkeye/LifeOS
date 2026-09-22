<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class MobileCredentialsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_sign_in_verifies_the_password_before_requesting_a_second_factor(): void
    {
        [$owner, $secret] = $this->ownerWithConfirmedAuthenticator();

        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => 'mobile@example.test',
            'password' => 'wrong password',
            'device_name' => 'iPhone 16',
        ])->assertUnprocessable();
        $this->assertDatabaseCount('mobile_login_challenges', 0);

        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'device_name' => 'iPhone 16',
        ])->assertAccepted()
            ->assertJsonPath('data.status', 'challenge_required')
            ->assertJsonStructure(['data' => ['challenge_token', 'challenge_expires_at']])
            ->assertJsonMissingPath('data.access_token')
            ->json('data');

        $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => $this->invalidAuthenticatorCode($owner->two_factor_secret),
        ])->assertUnprocessable();

        $credentials = $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => Totp::codeFor($secret, now()->timestamp),
        ])->assertCreated()
            ->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'device_name']])
            ->json('data');

        $this->assertSame('iPhone 16', $credentials['device_name']);
        $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => Totp::codeFor($secret, now()->timestamp),
        ])->assertUnprocessable();
    }

    public function test_mobile_first_sign_in_can_enroll_an_authenticator_before_credentials_are_issued(): void
    {
        $owner = User::factory()->create([
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
        ]);

        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'device_name' => 'iPhone 16',
        ])->assertAccepted()
            ->assertJsonPath('data.status', 'setup_required')
            ->assertJsonStructure(['data' => ['secret', 'challenge_token', 'challenge_expires_at']])
            ->assertJsonMissingPath('data.access_token')
            ->json('data');

        $this->assertDatabaseHas('mobile_login_challenges', [
            'user_id' => $owner->id,
            'setup_required' => true,
        ]);
        $secret = $owner->fresh()->two_factor_secret;
        $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => $this->invalidAuthenticatorCode($secret),
        ])->assertUnprocessable();
        $this->assertDatabaseHas('mobile_login_challenges', [
            'user_id' => $owner->id,
            'attempts' => 1,
        ]);
        $credentials = $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => Totp::codeFor($secret, now()->timestamp),
        ])->assertCreated()->assertJsonStructure(['data' => ['access_token', 'refresh_token']])->json('data');

        $this->assertNotNull($owner->fresh()->two_factor_confirmed_at);
        $this->withToken($credentials['access_token'])->getJson('/api/v1/me')->assertOk();
    }

    public function test_owner_can_cancel_a_pending_mobile_enrollment_challenge(): void
    {
        User::factory()->create([
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
        ]);
        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'device_name' => 'iPhone 16',
        ])->assertAccepted()->json('data');

        $this->postJson('/api/v1/mobile/auth/two-factor/cancel', [
            'challenge_token' => $challenge['challenge_token'],
        ])->assertNoContent();
        $this->assertDatabaseMissing('mobile_login_challenges', [
            'token_hash' => hash('sha256', $challenge['challenge_token']),
        ]);
        $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => '123456',
        ])->assertUnprocessable();
    }

    public function test_authenticated_owner_can_manage_two_factor_setup_and_disable_it(): void
    {
        $owner = User::factory()->create([
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
        ]);

        $this->actingAs($owner)->getJson('/api/v1/security/two-factor')
            ->assertOk()->assertJsonPath('data.enabled', false);
        $setup = $this->postJson('/api/v1/security/two-factor/setup', [
            'current_password' => 'correct horse battery staple',
        ])->assertOk()->assertJsonStructure(['data' => ['secret', 'otpauth_uri']])->json('data');
        $this->postJson('/api/v1/security/two-factor/confirm', [
            'code' => Totp::codeFor($setup['secret'], now()->timestamp),
        ])->assertOk()->assertJsonPath('data.enabled', true);
        $accessToken = $owner->createToken('test-device')->plainTextToken;

        $this->deleteJson('/api/v1/security/two-factor', [
            'current_password' => 'correct horse battery staple',
            'code' => Totp::codeFor($setup['secret'], now()->timestamp),
        ])->assertNoContent();
        $this->assertNull($owner->fresh()->two_factor_secret);
        $this->assertNull($owner->fresh()->two_factor_confirmed_at);

        Auth::forgetGuards();
        $this->withToken($accessToken)->getJson('/api/v1/security/two-factor')->assertUnauthorized();
    }

    public function test_owner_can_sign_in_to_mobile_api_with_a_second_factor(): void
    {
        [$owner, $credentials] = $this->login();

        $this->assertSame('Bearer', $credentials['token_type']);
        $this->assertSame('Kitchen tablet', $credentials['device_name']);

        $this->withToken($credentials['access_token'])
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $owner->id);
    }

    public function test_refresh_rotates_once_and_reuse_revokes_the_entire_device_family(): void
    {
        [, $credentials] = $this->login();

        $rotated = $this->postJson('/api/v1/mobile/auth/refresh', [
            'refresh_token' => $credentials['refresh_token'],
        ])->assertOk()->json('data');

        $this->withToken($rotated['access_token'])->getJson('/api/v1/me')->assertOk();

        $this->postJson('/api/v1/mobile/auth/refresh', [
            'refresh_token' => $credentials['refresh_token'],
        ])->assertUnprocessable();

        Auth::forgetGuards();
        $this->withToken($rotated['access_token'])
            ->getJson('/api/v1/me')
            ->assertUnauthorized();
    }

    public function test_owner_can_revoke_a_mobile_device_with_its_refresh_token(): void
    {
        [, $credentials] = $this->login();

        $this->postJson('/api/v1/mobile/auth/revoke', [
            'refresh_token' => $credentials['refresh_token'],
        ])->assertNoContent();

        $this->withToken($credentials['access_token'])->getJson('/api/v1/me')->assertUnauthorized();
        $this->postJson('/api/v1/mobile/auth/refresh', [
            'refresh_token' => $credentials['refresh_token'],
        ])->assertUnprocessable();
    }

    public function test_account_deletion_also_revokes_mobile_access_and_refresh_credentials(): void
    {
        [$owner, $credentials] = $this->login();

        $this->actingAs($owner)->deleteJson('/api/v1/account', [
            'current_password' => 'correct horse battery staple',
            'email_confirmation' => $owner->email,
        ])->assertNoContent();

        Auth::forgetGuards();
        $this->withToken($credentials['access_token'])->getJson('/api/v1/me')->assertUnauthorized();
        $this->postJson('/api/v1/mobile/auth/refresh', [
            'refresh_token' => $credentials['refresh_token'],
        ])->assertUnprocessable();
    }

    public function test_mobile_login_rejects_an_invalid_authenticator_code(): void
    {
        $owner = User::factory()->create([
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'two_factor_secret' => 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
            'two_factor_confirmed_at' => now(),
        ]);

        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'device_name' => 'Kitchen tablet',
        ])->assertAccepted()->json('data');

        $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => $this->invalidAuthenticatorCode($owner->two_factor_secret),
        ])->assertUnprocessable();

        $this->getJson('/api/v1/me')->assertUnauthorized();

        $this->assertDatabaseHas('mobile_login_challenges', [
            'user_id' => $owner->id,
            'attempts' => 1,
        ]);
    }

    public function test_mobile_login_challenge_expires_after_five_minutes(): void
    {
        [$owner] = $this->ownerWithConfirmedAuthenticator();
        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => $owner->email,
            'password' => 'correct horse battery staple',
            'device_name' => 'iPhone 16',
        ])->assertAccepted()->json('data');

        $this->travel(6)->minutes();

        $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => Totp::codeFor($owner->two_factor_secret, now()->timestamp),
        ])->assertUnprocessable();
    }

    public function test_mobile_login_challenge_is_removed_after_five_invalid_codes(): void
    {
        [$owner] = $this->ownerWithConfirmedAuthenticator();
        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => $owner->email,
            'password' => 'correct horse battery staple',
            'device_name' => 'iPhone 16',
        ])->assertAccepted()->json('data');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
                'challenge_token' => $challenge['challenge_token'],
                'code' => $this->invalidAuthenticatorCode($owner->two_factor_secret),
            ])->assertUnprocessable();
        }

        $this->assertDatabaseMissing('mobile_login_challenges', [
            'token_hash' => hash('sha256', $challenge['challenge_token']),
        ]);
    }

    public function test_expired_refresh_token_is_rejected_and_revokes_its_device_family(): void
    {
        [, $credentials] = $this->login();
        $this->travelTo(now()->addDays(31));

        $this->postJson('/api/v1/mobile/auth/refresh', [
            'refresh_token' => $credentials['refresh_token'],
        ])->assertUnprocessable();

        $this->withToken($credentials['access_token'])->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_mobile_access_token_expires_after_its_short_lifetime(): void
    {
        [, $credentials] = $this->login();
        $this->travel(16)->minutes();

        $this->withToken($credentials['access_token'])->getJson('/api/v1/me')->assertUnauthorized();
    }

    /** @return array{0: User, 1: array<string, mixed>} */
    private function login(): array
    {
        [$owner] = $this->ownerWithConfirmedAuthenticator();

        $challenge = $this->postJson('/api/v1/mobile/auth/login', [
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'device_name' => 'Kitchen tablet',
        ])->assertAccepted()->json('data');

        $response = $this->postJson('/api/v1/mobile/auth/two-factor/challenge', [
            'challenge_token' => $challenge['challenge_token'],
            'code' => Totp::codeFor($owner->two_factor_secret, now()->timestamp),
        ]);

        $response->assertCreated()->assertJsonStructure([
            'data' => [
                'access_token',
                'access_token_expires_at',
                'refresh_token',
                'refresh_token_expires_at',
                'token_type',
                'device_name',
            ],
        ]);

        return [$owner, $response->json('data')];
    }

    /** @return array{0: User, 1: string} */
    private function ownerWithConfirmedAuthenticator(): array
    {
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
        $owner = User::factory()->create([
            'email' => 'mobile@example.test',
            'password' => 'correct horse battery staple',
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        return [$owner, $secret];
    }

    private function invalidAuthenticatorCode(string $secret): string
    {
        $now = now()->timestamp;
        $validCodes = [
            Totp::codeFor($secret, $now - 30),
            Totp::codeFor($secret, $now),
            Totp::codeFor($secret, $now + 30),
        ];

        for ($candidate = 0; $candidate < 1_000_000; $candidate++) {
            $code = str_pad((string) $candidate, 6, '0', STR_PAD_LEFT);

            if (! in_array($code, $validCodes, true)) {
                return $code;
            }
        }

        throw new \LogicException('A non-matching authenticator code must exist.');
    }
}
