<?php

use App\Modules\Finance\Http\Controllers\FinanceAccountController;
use App\Modules\Finance\Http\Controllers\FinanceBudgetController;
use App\Modules\Finance\Http\Controllers\FinanceCategoryController;
use App\Modules\Finance\Http\Controllers\FinanceOverviewController;
use App\Modules\Finance\Http\Controllers\FinanceSavingsGoalController;
use App\Modules\Finance\Http\Controllers\FinanceSubscriptionController;
use App\Modules\Finance\Http\Controllers\FinanceTransactionController;
use App\Modules\Finance\Http\Controllers\FinanceTransferController;
use App\Modules\Foundation\Http\Controllers\OwnerSettingsController;
use App\Modules\Foundation\Http\Controllers\SessionController;
use App\Modules\Foundation\Http\Resources\OwnerProfileResource;
use App\Modules\Health\Http\Controllers\HealthController;
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
        Route::patch('/finance/transactions/{transaction}', [FinanceTransactionController::class, 'update'])
            ->name('finance.transactions.update');
        Route::delete('/finance/transactions/{transaction}', [FinanceTransactionController::class, 'destroy'])
            ->name('finance.transactions.destroy');
        Route::get('/finance/overview', [FinanceOverviewController::class, 'show'])
            ->name('finance.overview.show');

        Route::get('/finance/budgets', [FinanceBudgetController::class, 'index'])->name('finance.budgets.index');
        Route::post('/finance/budgets', [FinanceBudgetController::class, 'store'])->name('finance.budgets.store');
        Route::patch('/finance/budgets/{budget}', [FinanceBudgetController::class, 'update'])->name('finance.budgets.update');
        Route::delete('/finance/budgets/{budget}', [FinanceBudgetController::class, 'destroy'])->name('finance.budgets.destroy');

        Route::get('/finance/subscriptions', [FinanceSubscriptionController::class, 'index'])->name('finance.subscriptions.index');
        Route::post('/finance/subscriptions', [FinanceSubscriptionController::class, 'store'])->name('finance.subscriptions.store');
        Route::patch('/finance/subscriptions/{subscription}', [FinanceSubscriptionController::class, 'update'])->name('finance.subscriptions.update');

        Route::get('/finance/savings-goals', [FinanceSavingsGoalController::class, 'index'])->name('finance.savings-goals.index');
        Route::post('/finance/savings-goals', [FinanceSavingsGoalController::class, 'store'])->name('finance.savings-goals.store');
        Route::patch('/finance/savings-goals/{goal}', [FinanceSavingsGoalController::class, 'update'])->name('finance.savings-goals.update');
        Route::delete('/finance/savings-goals/{goal}', [FinanceSavingsGoalController::class, 'destroy'])->name('finance.savings-goals.destroy');

        Route::get('/finance/transfers', [FinanceTransferController::class, 'index'])
            ->name('finance.transfers.index');
        Route::post('/finance/transfers', [FinanceTransferController::class, 'store'])
            ->name('finance.transfers.store');

        Route::get('/health/sources', [HealthController::class, 'sources']);
        Route::post('/health/sources', [HealthController::class, 'storeSource']);
        Route::post('/health/sync-runs', [HealthController::class, 'startRun']);
        Route::patch('/health/sync-runs/{run}', [HealthController::class, 'finishRun']);
        Route::get('/health/samples', [HealthController::class, 'samples']);
        Route::post('/health/samples', [HealthController::class, 'storeSample']);
        Route::post('/health/imports', [HealthController::class, 'import']);
    });
});
