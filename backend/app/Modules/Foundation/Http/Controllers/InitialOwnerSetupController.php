<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use App\Modules\Foundation\Application\Authentication\CreateInitialOwner;
use App\Modules\Foundation\Application\Authentication\OwnerSecondFactor;
use App\Modules\Foundation\Http\Requests\CreateInitialOwnerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InitialOwnerSetupController
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => ['required' => ! User::query()->exists()],
        ]);
    }

    public function store(
        CreateInitialOwnerRequest $request,
        CreateInitialOwner $createInitialOwner,
        OwnerSecondFactor $secondFactor,
    ): JsonResponse {
        $owner = $createInitialOwner->create($request->validated());

        if (! $owner instanceof User) {
            return response()->json([
                'message' => 'The LifeOS owner account has already been created.',
            ], 409);
        }

        Auth::guard('web')->logout();
        Auth::forgetGuards();
        $request->session()->regenerate();
        $request->session()->put('auth.pending_user_id', $owner->getKey());

        return response()->json([
            'data' => [
                'status' => 'setup_required',
                'secret' => $secondFactor->begin($owner),
            ],
        ], 202);
    }
}
