<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\ManageMobileCredentials;
use App\Modules\Foundation\Application\Authentication\ManageMobilePasskeyLogin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class MobilePasskeyLoginController
{
    public function begin(Request $request, ManageMobilePasskeyLogin $logins): JsonResponse
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]+$/'],
            'code_challenge' => ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);

        return response()->json(['data' => [
            'login_url' => $logins->begin($data['state'], $data['code_challenge']),
        ]], 201);
    }

    public function prepare(Request $request, ManageMobilePasskeyLogin $logins): JsonResponse
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);
        $logins->prepare($data['state'], $request);

        return response()->json(['data' => ['ready' => true]]);
    }

    public function complete(Request $request, ManageMobilePasskeyLogin $logins): JsonResponse
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);
        $owner = Auth::guard('web')->user();

        if (! $owner instanceof User) {
            throw ValidationException::withMessages(['state' => 'Sign in with a passkey first.']);
        }

        $code = $logins->complete($data['state'], $owner, $request);

        return response()->json(['data' => [
            'callback_url' => 'lifeos://passkey-auth?code='.urlencode($code).'&state='.urlencode($data['state']),
        ]]);
    }

    public function exchange(Request $request, ManageMobilePasskeyLogin $logins, ManageMobileCredentials $credentials): JsonResponse
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]+$/'],
            'code' => ['required', 'string', 'size:64'],
            'code_verifier' => ['required', 'string', 'min:43', 'max:128', 'regex:/^[A-Za-z0-9._~-]+$/'],
        ]);

        return response()->json(['data' => $logins->exchange(
            $data['state'],
            $data['code'],
            $data['code_verifier'],
            $credentials,
        )]);
    }
}
