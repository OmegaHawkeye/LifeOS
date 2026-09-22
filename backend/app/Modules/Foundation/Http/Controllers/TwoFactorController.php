<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\OwnerSecondFactor;
use App\Modules\Foundation\Http\Requests\VerifyTwoFactorRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorController
{
    public function __construct(private readonly OwnerSecondFactor $secondFactor) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => [
            'enabled' => $request->user()->two_factor_confirmed_at !== null,
        ]]);
    }

    public function begin(Request $request): JsonResponse
    {
        $data = $request->validate(['current_password' => ['required', 'string']]);
        /** @var User $owner */
        $owner = $request->user();

        $this->assertCurrentPassword($owner, $data['current_password']);
        if ($owner->two_factor_confirmed_at !== null) {
            abort(409, 'Two-factor authentication is already enabled.');
        }

        $secret = $this->secondFactor->begin($owner);

        return response()->json(['data' => [
            'secret' => $secret,
            'otpauth_uri' => sprintf(
                'otpauth://totp/LifeOS:%s?secret=%s&issuer=LifeOS&algorithm=SHA1&digits=6&period=30',
                rawurlencode($owner->email),
                $secret,
            ),
        ]]);
    }

    public function confirm(VerifyTwoFactorRequest $request): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();
        $this->secondFactor->confirmSetup($owner, $request->string('code')->toString());

        return response()->json(['data' => ['enabled' => true]]);
    }

    public function destroy(Request $request): Response
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'code' => ['required', 'digits:6'],
        ]);
        /** @var User $owner */
        $owner = $request->user();
        $this->assertCurrentPassword($owner, $data['current_password']);
        $this->secondFactor->verifyChallenge($owner, $data['code']);
        $owner->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null])->save();
        $owner->tokens()->delete();
        DB::table('mobile_refresh_tokens')->where('user_id', $owner->getKey())->delete();

        return response()->noContent();
    }

    /** @throws ValidationException */
    private function assertCurrentPassword(User $owner, string $password): void
    {
        if (! Hash::check($password, $owner->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }
    }
}
