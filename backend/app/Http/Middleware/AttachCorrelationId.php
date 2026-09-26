<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class AttachCorrelationId
{
    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = (string) Str::uuid();
        $request->attributes->set('correlation_id', $correlationId);

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            $status = $exception instanceof HttpExceptionInterface
                ? $exception->getStatusCode()
                : 500;

            if ($status < 500) {
                throw $exception;
            }

            Log::error('LifeOS request failed.', [
                'correlation_id' => $correlationId,
                'exception' => $exception::class,
                'file' => basename($exception->getFile()),
                'line' => $exception->getLine(),
                'method' => $request->method(),
                'route' => $request->route()?->getName() ?? 'unmatched',
                'status' => $status,
            ]);

            $response = $request->is('api/*') || $request->expectsJson()
                ? response()->json([
                    'message' => 'LifeOS could not complete the request.',
                    'correlation_id' => $correlationId,
                ], $status)
                : response('LifeOS could not complete the request.', $status);
        }

        $response->headers->set('X-Correlation-ID', $correlationId);

        return $response;
    }
}
