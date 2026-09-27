<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\Totp;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OwnerFirstRunSetupTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_setup_status_only_reports_whether_initial_provisioning_is_required(): void
    {
        $this->getJson('/api/v1/setup/status')
            ->assertOk()
            ->assertExactJson(['data' => ['required' => true]]);

        User::factory()->create();

        $this->getJson('/api/v1/setup/status')
            ->assertOk()
            ->assertExactJson(['data' => ['required' => false]]);
    }

    public function test_initial_owner_can_be_created_in_browser_and_must_complete_two_factor_setup(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/setup/owner', [
                'name' => 'Julian',
                'email' => 'OWNER@example.test',
                'password' => 'a considerably safer password',
                'password_confirmation' => 'a considerably safer password',
            ])
            ->assertAccepted()
            ->assertJsonPath('data.status', 'setup_required');

        $owner = User::query()->firstOrFail();
        $this->assertSame('owner@example.test', $owner->email);
        $this->assertTrue(Hash::check('a considerably safer password', $owner->password));
        $this->assertNotNull($owner->two_factor_secret);
        $this->assertNull($owner->two_factor_confirmed_at);
        $this->assertDatabaseHas('owner_settings', [
            'user_id' => $owner->id,
            'timezone' => 'Europe/Vienna',
            'currency' => 'EUR',
        ]);
        $response->assertSessionHas('auth.pending_user_id', $owner->id);
        $this->getJson('/api/v1/me')->assertUnauthorized();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/two-factor/confirm', [
                'code' => Totp::codeFor($owner->two_factor_secret, now()->timestamp),
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $owner->id);
    }

    public function test_setup_cannot_create_a_second_owner(): void
    {
        User::factory()->create();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/setup/owner', [
                'name' => 'Second owner',
                'email' => 'second@example.test',
                'password' => 'a considerably safer password',
                'password_confirmation' => 'a considerably safer password',
            ])
            ->assertConflict();

        $this->assertDatabaseCount('users', 1);
    }

    public function test_setup_validates_the_password_and_never_creates_a_partial_owner(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/setup/owner', [
                'name' => 'Julian',
                'email' => 'owner@example.test',
                'password' => 'short',
                'password_confirmation' => 'different',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('owner_settings', 0);
    }
}
