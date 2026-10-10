<?php

use App\Http\Middleware\AttachCorrelationId;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/passkeys.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(AttachCorrelationId::class);
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(function (Request $request): ?string {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            return '/login';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->context(function (): array {
            $correlationId = request()->attributes->get('correlation_id');

            return is_string($correlationId)
                ? ['correlation_id' => $correlationId]
                : [];
        });

        $exceptions->respond(function (Response $response): Response {
            $request = request();
            $correlationId = $request->attributes->get('correlation_id');

            if (is_string($correlationId)) {
                $response->headers->set('X-Correlation-ID', $correlationId);
            }

            if ($request->is('api/*') && $response->isServerError()) {
                return response()->json([
                    'message' => 'LifeOS could not complete the request.',
                    'correlation_id' => $correlationId,
                ], $response->getStatusCode(), [
                    'X-Correlation-ID' => (string) $correlationId,
                ]);
            }

            return $response;
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
