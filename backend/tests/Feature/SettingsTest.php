<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_owner_settings_have_safe_defaults_and_persist_across_requests(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/settings')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'timezone' => 'Europe/Vienna',
                    'currency' => 'EUR',
                    'measurement_system' => 'metric',
                    'theme' => 'system',
                    'mask_sensitive_data_by_default' => true,
                    'notifications_enabled' => false,
                    'passkeys_enabled' => true,
                    'passkey_origin' => 'http://localhost:5173',
                    'passkey_origin_is_secure' => false,
                ],
            ]);

        $this->patchJson('/api/v1/settings', [
            'timezone' => 'Europe/Berlin',
            'currency' => 'CHF',
            'measurement_system' => 'imperial',
            'theme' => 'dark',
            'mask_sensitive_data_by_default' => false,
            'notifications_enabled' => true,
            'passkeys_enabled' => false,
        ])->assertOk();

        $this->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.timezone', 'Europe/Berlin')
            ->assertJsonPath('data.currency', 'CHF')
            ->assertJsonPath('data.measurement_system', 'imperial')
            ->assertJsonPath('data.theme', 'dark')
            ->assertJsonPath('data.mask_sensitive_data_by_default', false)
            ->assertJsonPath('data.notifications_enabled', true)
            ->assertJsonPath('data.passkeys_enabled', false);
    }

    public function test_owner_settings_reject_invalid_values_without_overwriting_saved_values(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $this->patchJson('/api/v1/settings', [
            'timezone' => 'Not/A_Timezone',
            'currency' => 'EURO',
            'measurement_system' => 'custom',
            'theme' => 'neon',
            'mask_sensitive_data_by_default' => 'sometimes',
        ])->assertUnprocessable();

        $this->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.timezone', 'Europe/Vienna')
            ->assertJsonPath('data.currency', 'EUR');
    }

    public function test_empty_or_unrecognized_updates_are_rejected(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $this->patchJson('/api/v1/settings', [])->assertUnprocessable();
        $this->patchJson('/api/v1/settings', ['is_admin' => true])->assertUnprocessable();

        $this->assertDatabaseCount('owner_settings', 0);
    }
}
