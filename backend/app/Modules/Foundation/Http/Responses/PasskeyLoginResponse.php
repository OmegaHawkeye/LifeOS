<?php

namespace App\Modules\Foundation\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class PasskeyLoginResponse implements PasskeyLoginResponseContract
{
    public function toResponse($request): Response
    {
        if ($request->session()->has('mobile_passkey_login.state_hash')) {
            $request->session()->put('mobile_passkey_login.verified_at', now()->timestamp);
        }

        if ($request->wantsJson()) {
            return new JsonResponse([
                'redirect' => redirect()->intended(config('passkeys.redirect', '/'))->getTargetUrl(),
            ]);
        }

        return redirect()->intended(config('passkeys.redirect', '/'));
    }
}
