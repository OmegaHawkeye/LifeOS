<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\Totp;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_private_endpoints_reject_an_unauthenticated_request(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
        $this->getJson('/api/v1/settings')->assertUnauthorized();
    }

    public function test_owner_can_sign_in_and_sign_out_with_a_session(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ]);

        $login = $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'OWNER@EXAMPLE.TEST',
            'password' => 'correct horse battery staple',
        ])->assertStatus(202)->assertJsonPath('data.status', 'setup_required');

        $secret = $login->json('data.secret');
        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/two-factor/confirm', [
            'code' => Totp::codeFor($secret, now()->timestamp),
        ])->assertOk()->assertJsonPath('data.id', $owner->id);

        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'owner@example.test');

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_invalid_credentials_do_not_create_an_authenticated_session(): void
    {
        User::factory()->create([
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.test',
            'password' => 'wrong password',
        ])->assertUnprocessable();

        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_configured_owner_must_complete_the_two_factor_challenge(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
            'two_factor_secret' => 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ])->assertStatus(202)
            ->assertJsonPath('data.status', 'challenge_required')
            ->assertJsonMissingPath('data.secret');

        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/v1/me')->assertUnauthorized();
        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/two-factor/challenge', [
            'code' => '000000',
        ])->assertUnprocessable();

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/two-factor/challenge', [
            'code' => Totp::codeFor($owner->two_factor_secret, now()->timestamp),
        ])->assertOk()->assertJsonPath('data.id', $owner->id);

        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/v1/me')->assertOk();
    }

    public function test_login_attempts_are_rate_limited(): void
    {
        User::factory()->create(['email' => 'owner@example.test']);

        foreach (range(1, 5) as $attempt) {
            $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
                'email' => 'owner@example.test',
                'password' => 'wrong password',
            ])->assertUnprocessable();
        }

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.test',
            'password' => 'wrong password',
        ])->assertTooManyRequests();
    }

    public function test_owner_can_change_password_with_current_password(): void
    {
        $owner = User::factory()->create(['password' => 'correct horse battery staple']);
        $this->actingAs($owner);

        $this->putJson('/api/v1/auth/password', [
            'current_password' => 'correct horse battery staple',
            'password' => 'a considerably safer password',
            'password_confirmation' => 'a considerably safer password',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('a considerably safer password', $owner->refresh()->password));
    }
}
