<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\Totp;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Drives the API the way the web app does: each request carries only the
 * session cookie the previous response set, and nothing survives in memory
 * between requests, so a route that swaps the session cookie signs the owner out.
 */
class SpaSessionPersistenceTest extends TestCase
{
    use LazilyRefreshDatabase;

    private const ORIGIN = 'http://localhost:5173';

    /** @var array<string, string> */
    private array $cookies = [];

    protected function setUp(): void
    {
        parent::setUp();

        config(['session.driver' => 'database']);
    }

    public function test_loading_the_passkey_list_keeps_the_owner_signed_in(): void
    {
        $this->signIn();

        $this->spaGet('/api/v1/security/passkeys')->assertOk();

        $this->spaGet('/api/v1/me')->assertOk();
    }

    private function signIn(): void
    {
        User::factory()->create([
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ]);

        $login = $this->spaPost('/api/v1/auth/login', [
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ])->assertStatus(202);

        $this->spaPost('/api/v1/auth/two-factor/confirm', [
            'code' => Totp::codeFor($login->json('data.secret'), now()->timestamp),
        ])->assertOk();

        $this->spaGet('/api/v1/me')->assertOk();
    }

    private function spaGet(string $uri): TestResponse
    {
        return $this->rememberSessionCookie($this->spaClient()->getJson($uri));
    }

    /** @param array<string, mixed> $data */
    private function spaPost(string $uri, array $data): TestResponse
    {
        return $this->rememberSessionCookie($this->spaClient()->postJson($uri, $data));
    }

    /**
     * A real server starts every request with no signed-in user and no loaded
     * session, so forget the ones the test application keeps in memory.
     */
    private function spaClient(): static
    {
        $this->app['auth']->forgetGuards();
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        $this->defaultCookies = [];

        return $this->withHeader('Origin', self::ORIGIN)
            ->withCredentials()
            ->withCookies($this->cookies);
    }

    private function rememberSessionCookie(TestResponse $response): TestResponse
    {
        $sessionCookie = (string) config('session.cookie');
        $cookie = $response->getCookie($sessionCookie);

        if ($cookie !== null) {
            $this->cookies[$sessionCookie] = (string) $cookie->getValue();
        }

        return $response;
    }
}
