<?php

namespace App\Modules\Foundation\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class PasskeyLoginResponse implements PasskeyLoginResponseContract
{
    public function toResponse($request): Response
    {
        $owner = $request->user(config('fortify.guard'));
        $stateHash = $request->session()->get('mobile_passkey_login.state_hash');

        if ($owner !== null && is_string($stateHash)) {
            $request->session()->put([
                'mobile_passkey_login.verified_at' => now()->timestamp,
                'mobile_passkey_login.verified_user_id' => $owner->getAuthIdentifier(),
                'mobile_passkey_login.verified_state_hash' => $stateHash,
            ]);
        }

        if ($request->wantsJson()) {
            return new JsonResponse([
                'redirect' => redirect()->intended(config('passkeys.redirect', '/'))->getTargetUrl(),
            ]);
        }

        return redirect()->intended(config('passkeys.redirect', '/'));
    }
}
