<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OwnerProvisioningTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_initial_owner_is_created_with_default_settings_from_secure_prompts(): void
    {
        $this->artisan('lifeos:owner')
            ->expectsQuestion('Owner name', 'Julian')
            ->expectsQuestion('Owner email', 'owner@example.test')
            ->expectsQuestion('Owner password', 'correct horse battery staple')
            ->expectsQuestion('Confirm password', 'correct horse battery staple')
            ->expectsOutput('LifeOS owner provisioned for owner@example.test.')
            ->assertExitCode(0);

        $owner = User::query()->firstOrFail();
        $this->assertTrue(Hash::check('correct horse battery staple', $owner->password));
        $this->assertDatabaseHas('owner_settings', [
            'user_id' => $owner->id,
            'timezone' => 'Europe/Vienna',
            'currency' => 'EUR',
        ]);
    }

    public function test_password_recovery_rotates_the_password_and_revokes_sessions_and_tokens(): void
    {
        $owner = User::factory()->create([
            'password' => 'original password',
            'two_factor_secret' => 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
            'two_factor_confirmed_at' => now(),
        ]);
        $owner->createToken('ipad');
        DB::table('sessions')->insert([
            'id' => 'existing-session',
            'user_id' => $owner->id,
            'payload' => 'serialized session',
            'last_activity' => now()->timestamp,
        ]);

        $this->artisan('lifeos:owner --reset-password')
            ->expectsQuestion('New owner password', 'new password for lifeos')
            ->expectsQuestion('Confirm password', 'new password for lifeos')
            ->expectsOutput('Owner password updated; active sessions and API tokens were revoked.')
            ->assertExitCode(0);

        $this->assertTrue(Hash::check('new password for lifeos', $owner->fresh()->password));
        $this->assertNull($owner->fresh()->two_factor_secret);
        $this->assertNull($owner->fresh()->two_factor_confirmed_at);
        $this->assertDatabaseMissing('sessions', ['id' => 'existing-session']);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_owner_provisioning_refuses_to_create_a_second_account(): void
    {
        User::factory()->create();

        $this->artisan('lifeos:owner')
            ->expectsOutput('The owner account already exists. Use --reset-password to recover access.')
            ->assertExitCode(1);
    }
}
