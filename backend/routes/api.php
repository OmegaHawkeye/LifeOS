<?php

use App\Modules\Finance\Http\Controllers\FinanceAccountController;
use App\Modules\Finance\Http\Controllers\FinanceCategoryController;
use App\Modules\Finance\Http\Controllers\FinanceTransactionController;
use App\Modules\Finance\Http\Controllers\FinanceTransferController;
use App\Modules\Foundation\Http\Controllers\OwnerSettingsController;
use App\Modules\Foundation\Http\Controllers\SessionController;
use App\Modules\Foundation\Http\Resources\OwnerProfileResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('/readiness', fn (): array => [
        'service' => 'lifeos-api',
        'status' => 'ok',
    ])->name('readiness');

    Route::post('/auth/login', [SessionController::class, 'store'])
        ->middleware('throttle:login')
        ->name('auth.login');
    Route::post('/auth/two-factor/confirm', [SessionController::class, 'confirmTwoFactor'])
        ->middleware('throttle:two-factor')
        ->name('auth.two-factor.confirm');
    Route::post('/auth/two-factor/challenge', [SessionController::class, 'challenge'])
        ->middleware('throttle:two-factor')
        ->name('auth.two-factor.challenge');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [SessionController::class, 'destroy'])->name('auth.logout');

        Route::get('/me', fn (Request $request): OwnerProfileResource => new OwnerProfileResource($request->user()))
            ->name('me.show');

        Route::get('/settings', [OwnerSettingsController::class, 'show'])->name('settings.show');
        Route::patch('/settings', [OwnerSettingsController::class, 'update'])->name('settings.update');

        Route::get('/finance/accounts', [FinanceAccountController::class, 'index'])
            ->name('finance.accounts.index');
        Route::post('/finance/accounts', [FinanceAccountController::class, 'store'])
            ->name('finance.accounts.store');

        Route::get('/finance/categories', [FinanceCategoryController::class, 'index'])
            ->name('finance.categories.index');
        Route::post('/finance/categories', [FinanceCategoryController::class, 'store'])
            ->name('finance.categories.store');
        Route::patch('/finance/categories/{category}', [FinanceCategoryController::class, 'update'])
            ->name('finance.categories.update');

        Route::get('/finance/transactions', [FinanceTransactionController::class, 'index'])
            ->name('finance.transactions.index');
        Route::post('/finance/transactions', [FinanceTransactionController::class, 'store'])
            ->name('finance.transactions.store');

        Route::get('/finance/transfers', [FinanceTransferController::class, 'index'])
            ->name('finance.transfers.index');
        Route::post('/finance/transfers', [FinanceTransferController::class, 'store'])
            ->name('finance.transfers.store');
    });
});
