<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\RoutePath;
use Laravel\Passkeys\Http\Controllers\PasskeyConfirmationController;
use Laravel\Passkeys\Http\Controllers\PasskeyLoginController;
use Laravel\Passkeys\Http\Controllers\PasskeyRegistrationController;

Route::group(['middleware' => config('fortify.middleware', ['web'])], function (): void {
    $throttle = config('fortify.limiters.passkeys');
    $throttleMiddleware = $throttle ? ['throttle:'.$throttle] : [];
    $authMiddleware = [config('fortify.auth_middleware', 'auth').':'.config('fortify.guard')];
    $managementMiddleware = config('fortify-options.passkeys.confirmPassword', true)
        ? [...$authMiddleware, 'password.confirm', ...$throttleMiddleware]
        : [...$authMiddleware, ...$throttleMiddleware];

    Route::get(RoutePath::for('passkey.login-options', '/passkeys/login/options'), [PasskeyLoginController::class, 'index'])
        ->middleware(['guest:'.config('fortify.guard'), ...$throttleMiddleware])
        ->name('passkey.login-options');

    Route::post(RoutePath::for('passkey.login', '/passkeys/login'), [PasskeyLoginController::class, 'store'])
        ->middleware(['guest:'.config('fortify.guard'), ...$throttleMiddleware])
        ->name('passkey.login');

    Route::get(RoutePath::for('passkey.confirm-options', '/passkeys/confirm/options'), [PasskeyConfirmationController::class, 'index'])
        ->middleware([...$authMiddleware, ...$throttleMiddleware])
        ->name('passkey.confirm-options');

    Route::post(RoutePath::for('passkey.confirm', '/passkeys/confirm'), [PasskeyConfirmationController::class, 'store'])
        ->middleware([...$authMiddleware, ...$throttleMiddleware])
        ->name('passkey.confirm');

    Route::get(RoutePath::for('passkey.registration-options', '/user/passkeys/options'), [PasskeyRegistrationController::class, 'index'])
        ->middleware($managementMiddleware)
        ->name('passkey.registration-options');

    Route::post(RoutePath::for('passkey.store', '/user/passkeys'), [PasskeyRegistrationController::class, 'store'])
        ->middleware($managementMiddleware)
        ->name('passkey.store');

    Route::delete(RoutePath::for('passkey.destroy', '/user/passkeys/{passkey}'), [PasskeyRegistrationController::class, 'destroy'])
        ->middleware($authMiddleware)
        ->name('passkey.destroy');
});
