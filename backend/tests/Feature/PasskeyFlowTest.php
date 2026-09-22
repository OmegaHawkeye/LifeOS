<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Passkeys\Support\WebAuthn;
use ParagonIE\ConstantTime\Base64UrlSafe;
use Symfony\Component\Uid\Uuid;
use Tests\TestCase;
use Webauthn\AuthenticatorAssertionResponse;
use Webauthn\AuthenticatorData;
use Webauthn\CollectedClientData;
use Webauthn\CredentialRecord;
use Webauthn\Exception\AuthenticatorResponseVerificationException;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\TrustPath\EmptyTrustPath;

class PasskeyFlowTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guest_can_request_a_passkey_login_challenge_from_fortify(): void
    {
        $this->getJson('/passkeys/login/options')
            ->assertOk()
            ->assertJsonStructure([
                'options' => ['challenge', 'rpId', 'timeout', 'userVerification'],
            ]);
    }

    public function test_passkey_assertions_from_an_untrusted_origin_are_rejected(): void
    {
        config()->set('passkeys.allowed_origins', ['https://lifeos.example']);

        $challenge = random_bytes(32);
        $clientData = [
            'type' => 'webauthn.get',
            'challenge' => Base64UrlSafe::encodeUnpadded($challenge),
            'origin' => 'https://attacker.example',
        ];
        $response = AuthenticatorAssertionResponse::create(
            CollectedClientData::create(
                json_encode($clientData, JSON_THROW_ON_ERROR),
                $clientData,
            ),
            AuthenticatorData::create('', '', chr(AuthenticatorData::FLAG_UP), 0),
            '',
            'owner-handle',
        );
        $credential = CredentialRecord::create(
            'credential-id',
            'public-key',
            [],
            'none',
            EmptyTrustPath::create(),
            Uuid::v4(),
            '',
            'owner-handle',
            0,
        );

        $this->expectException(AuthenticatorResponseVerificationException::class);
        $this->expectExceptionMessage('Invalid origin');

        WebAuthn::assertionValidator()->check(
            $credential,
            $response,
            PublicKeyCredentialRequestOptions::create($challenge, 'lifeos.example'),
            'lifeos.example',
            'owner-handle',
        );
    }

    public function test_expired_mobile_passkey_login_state_cannot_be_prepared(): void
    {
        $state = str_repeat('s', 43);
        $challenge = str_repeat('c', 43);

        $this->postJson('/api/v1/mobile/passkeys', [
            'state' => $state,
            'code_challenge' => $challenge,
        ])->assertCreated();

        DB::table('mobile_passkey_login_challenges')
            ->where('state_hash', hash('sha256', $state))
            ->update(['expires_at' => now()->subSecond()]);

        $this->withSession([])
            ->postJson('/api/v1/mobile/passkeys/prepare', ['state' => $state])
            ->assertUnprocessable();
    }

    public function test_passkey_login_uses_a_short_lived_single_use_pkce_code_for_mobile_tokens(): void
    {
        $owner = User::factory()->create();
        $state = str_repeat('s', 43);
        $verifier = str_repeat('v', 43);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        $this->postJson('/api/v1/mobile/passkeys', [
            'state' => $state,
            'code_challenge' => $challenge,
        ])->assertCreated();

        $stateHash = hash('sha256', $state);
        $complete = $this->actingAs($owner, 'web')->withSession([
            'mobile_passkey_login.state_hash' => $stateHash,
            'mobile_passkey_login.verified_at' => now()->timestamp,
        ])->postJson('/api/v1/mobile/passkeys/complete', ['state' => $state])
            ->assertOk();
        $callbackUrl = (string) $complete->json('data.callback_url');
        parse_str((string) parse_url($callbackUrl, PHP_URL_QUERY), $callback);
        $this->assertSame($state, $callback['state'] ?? null);
        $exchangeCode = $callback['code'] ?? '';
        $this->assertSame(64, strlen($exchangeCode));

        $codeHash = DB::table('mobile_passkey_login_challenges')
            ->where('state_hash', $stateHash)
            ->value('exchange_code_hash');
        $this->assertIsString($codeHash);

        $this->postJson('/api/v1/mobile/passkeys/exchange', [
            'state' => $state,
            'code' => $exchangeCode,
            'code_verifier' => str_repeat('x', 43),
        ])->assertUnprocessable();

        $response = $this->postJson('/api/v1/mobile/passkeys/exchange', [
            'state' => $state,
            'code' => $exchangeCode,
            'code_verifier' => $verifier,
        ]);

        $response->assertOk()->assertJsonPath('data.token_type', 'Bearer');
        $response->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'access_token_expires_at']]);

        $this->postJson('/api/v1/mobile/passkeys/exchange', [
            'state' => $state,
            'code' => $exchangeCode,
            'code_verifier' => $verifier,
        ])->assertUnprocessable();
    }
}
