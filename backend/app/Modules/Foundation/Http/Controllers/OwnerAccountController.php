<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Models\User;
use App\Modules\Foundation\Application\AccountDeletion\DeleteOwnerAccount;
use App\Modules\Foundation\Http\Requests\DeleteOwnerAccountRequest;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OwnerAccountController
{
    public function destroy(DeleteOwnerAccountRequest $request, DeleteOwnerAccount $deleteOwnerAccount): Response
    {
        /** @var User $owner */
        $owner = $request->user();
        $deleteOwnerAccount->delete($owner);

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            Auth::forgetGuards();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }
}
