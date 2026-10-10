<?php

namespace Tests\Feature;

use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class RequestDiagnosticsTest extends TestCase
{
    public function test_api_responses_include_a_server_generated_correlation_id(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost:5173')
            ->withHeader('X-Correlation-ID', 'client-value')
            ->getJson('/api/v1/readiness');

        $response
            ->assertOk()
            ->assertHeader('X-Correlation-ID')
            ->assertHeader('Access-Control-Expose-Headers', 'X-Correlation-ID');

        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            (string) $response->headers->get('X-Correlation-ID'),
        );
        $this->assertNotSame('client-value', $response->headers->get('X-Correlation-ID'));
    }

    public function test_expected_api_errors_keep_their_status_and_receive_a_correlation_id(): void
    {
        $response = $this->getJson('/api/v1/me');

        $response
            ->assertUnauthorized()
            ->assertHeader('X-Correlation-ID');
    }

    public function test_framework_exception_log_context_includes_the_request_correlation_id(): void
    {
        $correlationId = '5a739fd4-7959-40fd-ae84-9cb3fdf3d0e2';
        $this->app['request']->attributes->set('correlation_id', $correlationId);

        $context = $this->app->make(Handler::class)
            ->contextForException(new RuntimeException('internal test detail'));

        $this->assertSame($correlationId, $context['correlation_id']);
    }

    public function test_api_failures_include_a_safe_correlation_id_and_log_no_exception_message(): void
    {
        $loggedContext = [];
        Log::shouldReceive('error')
            ->once()
            ->with('LifeOS request failed.', Mockery::on(function ($context) use (&$loggedContext): bool {
                if (is_array($context)) {
                    $loggedContext = $context;
                }

                return true;
            }));

        Route::get('/api/v1/diagnostics/test-failure', function (): never {
            throw new RuntimeException('owner@example.test bearer secret-value');
        });

        $response = $this->getJson('/api/v1/diagnostics/test-failure');
        $correlationId = $response->headers->get('X-Correlation-ID');

        $response
            ->assertStatus(500)
            ->assertJsonPath('message', 'LifeOS could not complete the request.')
            ->assertJsonPath('correlation_id', $correlationId)
            ->assertDontSee('owner@example.test')
            ->assertDontSee('secret-value');

        $this->assertSame($correlationId, $loggedContext['correlation_id']);
        $this->assertArrayNotHasKey('message', $loggedContext);
        $this->assertArrayNotHasKey('exception_message', $loggedContext);
        $this->assertArrayNotHasKey('stack_trace', $loggedContext);
    }
}
