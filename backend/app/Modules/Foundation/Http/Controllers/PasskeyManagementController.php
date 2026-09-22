<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Passkeys\Passkey;
use Symfony\Component\HttpFoundation\Response;

class PasskeyManagementController
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();

        return response()->json(['data' => $owner->passkeys()
            ->get(['id', 'name', 'last_used_at', 'created_at'])
            ->map(fn (Passkey $passkey): array => [
                'id' => (string) $passkey->getKey(),
                'name' => $passkey->name,
                'last_used_at' => $passkey->last_used_at?->toIso8601String(),
                'created_at' => $passkey->created_at?->toIso8601String(),
            ])]);
    }

    public function beginMobileManagement(Request $request): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();
        $token = Str::random(64);

        DB::table('mobile_passkey_management_sessions')->insert([
            'user_id' => $owner->getKey(),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addMinutes(3),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => [
            'management_url' => rtrim((string) config('lifeos.passkey_web_url'), '/')
                .'/passkeys/manage?return=mobile#token='.urlencode($token),
        ]], Response::HTTP_CREATED);
    }

    public function redeemMobileManagement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'size:64', 'regex:/^[A-Za-z0-9]+$/'],
        ]);

        $owner = DB::transaction(function () use ($data): ?User {
            $handoff = DB::table('mobile_passkey_management_sessions')
                ->where('token_hash', hash('sha256', $data['token']))
                ->whereNull('consumed_at')
                ->lockForUpdate()
                ->first();

            if ($handoff === null || now()->greaterThan($handoff->expires_at)) {
                return null;
            }

            DB::table('mobile_passkey_management_sessions')
                ->where('id', $handoff->id)
                ->update(['consumed_at' => now(), 'updated_at' => now()]);

            $owner = User::query()->find($handoff->user_id);

            return $owner instanceof User ? $owner : null;
        });

        if (! $owner instanceof User) {
            throw ValidationException::withMessages([
                'token' => 'This passkey management link has expired or was already used.',
            ]);
        }

        Auth::guard('web')->login($owner);
        $request->session()->regenerate();

        return response()->json(['data' => ['ready' => true]]);
    }

    public function destroy(Request $request, Passkey $passkey): Response
    {
        abort_unless((string) $passkey->user_id === (string) $request->user()->getAuthIdentifier(), 404);

        $passkey->delete();

        return response()->noContent();
    }
}
