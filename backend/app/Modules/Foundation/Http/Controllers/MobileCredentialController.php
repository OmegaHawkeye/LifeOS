<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\ManageMobileCredentials;
use App\Modules\Foundation\Application\Authentication\ManageMobileLoginChallenges;
use App\Modules\Foundation\Application\Authentication\OwnerSecondFactor;
use App\Modules\Foundation\Http\Requests\MobileLoginRequest;
use App\Modules\Foundation\Http\Requests\MobileRefreshRequest;
use App\Modules\Foundation\Http\Requests\MobileRevokeRequest;
use App\Modules\Foundation\Http\Requests\MobileTwoFactorCancelRequest;
use App\Modules\Foundation\Http\Requests\MobileTwoFactorChallengeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class MobileCredentialController
{
    public function __construct(
        private readonly OwnerSecondFactor $secondFactor,
        private readonly ManageMobileCredentials $credentials,
        private readonly ManageMobileLoginChallenges $loginChallenges,
    ) {}

    /** @throws ValidationException */
    public function store(MobileLoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $owner = User::query()->where('email', $data['email'])->first();

        if (! $owner instanceof User || ! Hash::check($data['password'], $owner->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        if ($owner->two_factor_confirmed_at === null) {
            $challenge = $this->loginChallenges->begin(
                $owner,
                $data['device_name'],
                setupRequired: true,
            );

            return response()->json([
                'data' => [
                    'status' => 'setup_required',
                    'secret' => $this->secondFactor->begin($owner),
                    ...$challenge,
                ],
            ], Response::HTTP_ACCEPTED);
        }

        return response()->json([
            'data' => [
                'status' => 'challenge_required',
                ...$this->loginChallenges->begin($owner, $data['device_name']),
            ],
        ], Response::HTTP_ACCEPTED);
    }

    /** @throws ValidationException */
    public function challenge(MobileTwoFactorChallengeRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json([
            'data' => $this->loginChallenges->complete(
                $data['challenge_token'],
                $data['code'],
                $this->secondFactor,
                $this->credentials,
            ),
        ], Response::HTTP_CREATED);
    }

    public function cancel(MobileTwoFactorCancelRequest $request): Response
    {
        $this->loginChallenges->cancel($request->string('challenge_token')->toString());

        return response()->noContent();
    }

    public function refresh(MobileRefreshRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->credentials->rotate($request->string('refresh_token')->toString())]);
    }

    public function revoke(MobileRevokeRequest $request): Response
    {
        $this->credentials->revoke($request->string('refresh_token')->toString());

        return response()->noContent();
    }
}
