<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\OwnerSecondFactor;
use App\Modules\Foundation\Http\Requests\LoginRequest;
use App\Modules\Foundation\Http\Requests\VerifyTwoFactorRequest;
use App\Modules\Foundation\Http\Resources\OwnerProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class SessionController
{
    public function __construct(private readonly OwnerSecondFactor $secondFactor) {}

    /**
     * @throws ValidationException
     */
    public function store(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::guard('web')->validate($credentials)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $owner = User::query()->where('email', $credentials['email'])->firstOrFail();
        Auth::guard('web')->logout();
        Auth::forgetGuards();
        $request->session()->regenerate();
        $request->session()->put('auth.pending_user_id', $owner->getKey());

        if ($owner->two_factor_confirmed_at === null) {
            return response()->json([
                'data' => [
                    'status' => 'setup_required',
                    'secret' => $this->secondFactor->begin($owner),
                ],
            ], 202);
        }

        return response()->json(['data' => ['status' => 'challenge_required']], 202);
    }

    public function confirmTwoFactor(VerifyTwoFactorRequest $request): OwnerProfileResource
    {
        $owner = $this->pendingOwner($request);

        $this->secondFactor->confirmSetup($owner, $request->string('code')->toString());

        return $this->completeSignIn($request, $owner);
    }

    public function challenge(VerifyTwoFactorRequest $request): OwnerProfileResource
    {
        $owner = $this->pendingOwner($request);

        $this->secondFactor->verifyChallenge($owner, $request->string('code')->toString());

        return $this->completeSignIn($request, $owner);
    }

    public function destroy(Request $request): Response
    {
        Auth::guard('web')->logout();
        Auth::forgetGuards();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    private function pendingOwner(Request $request): User
    {
        $ownerId = $request->session()->get('auth.pending_user_id');

        if (! is_numeric($ownerId)) {
            abort(401, 'A password sign-in is required before two-factor verification.');
        }

        $owner = User::query()->find($ownerId);

        if (! $owner instanceof User) {
            abort(401, 'A password sign-in is required before two-factor verification.');
        }

        return $owner;
    }

    private function completeSignIn(Request $request, User $owner): OwnerProfileResource
    {
        $request->session()->forget('auth.pending_user_id');
        Auth::guard('web')->login($owner);
        $request->session()->regenerate();
        Auth::forgetGuards();

        return new OwnerProfileResource($owner);
    }
}
