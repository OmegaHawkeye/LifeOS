<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class PasskeyManagementApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_passkey_rp_uses_the_frontend_origin_by_default(): void
    {
        $webUrl = env('LIFEOS_PASSKEY_WEB_URL', env('FRONTEND_URL', 'http://localhost:5173'));
        $webOrigin = env('LIFEOS_PASSKEY_WEB_ORIGIN', $webUrl);

        $this->assertSame($webUrl, config('lifeos.passkey_web_url'));
        $this->assertSame(parse_url($webUrl, PHP_URL_HOST), config('passkeys.relying_party_id'));
        $this->assertSame([$webOrigin], config('passkeys.allowed_origins'));
    }

    public function test_signed_in_mobile_owner_can_create_a_short_lived_one_time_passkey_management_handoff(): void
    {
        $owner = User::factory()->create();

        $response = $this->actingAs($owner)->postJson('/api/v1/security/passkeys/management-sessions')
            ->assertCreated();

        $url = (string) $response->json('data.management_url');
        $this->assertStringStartsWith(
            rtrim((string) config('lifeos.passkey_web_url'), '/').'/passkeys/manage?return=mobile#token=',
            $url,
        );
        $token = substr($url, (int) strrpos($url, '=') + 1);

        $this->postJson('/api/v1/mobile/passkeys/management/redeem', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('data.ready', true);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/security/passkeys')->assertOk();
        $this->actingAs($owner, 'web')
            ->getJson('/user/passkeys/options')
            ->assertOk()
            ->assertJsonStructure(['options']);

        $this->postJson('/api/v1/mobile/passkeys/management/redeem', ['token' => $token])
            ->assertUnprocessable();
    }
}
