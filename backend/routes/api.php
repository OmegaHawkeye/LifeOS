<?php

use App\Modules\Dashboard\Http\Controllers\WeeklyReviewController;
use App\Modules\Finance\Http\Controllers\FinanceAccountController;
use App\Modules\Finance\Http\Controllers\FinanceAssetController;
use App\Modules\Finance\Http\Controllers\FinanceBudgetController;
use App\Modules\Finance\Http\Controllers\FinanceCategoryController;
use App\Modules\Finance\Http\Controllers\FinanceNetWorthController;
use App\Modules\Finance\Http\Controllers\FinanceOverviewController;
use App\Modules\Finance\Http\Controllers\FinanceSavingsGoalController;
use App\Modules\Finance\Http\Controllers\FinanceSubscriptionController;
use App\Modules\Finance\Http\Controllers\FinanceTransactionController;
use App\Modules\Finance\Http\Controllers\FinanceTransferController;
use App\Modules\Fitness\Http\Controllers\FitnessController;
use App\Modules\Fitness\Http\Controllers\FitnessDashboardController;
use App\Modules\Fitness\Http\Controllers\FitnessProgressPhotoController;
use App\Modules\Fitness\Http\Controllers\FitnessWorkoutController;
use App\Modules\Foundation\Http\Controllers\BackupStatusController;
use App\Modules\Foundation\Http\Controllers\MobileCredentialController;
use App\Modules\Foundation\Http\Controllers\MobilePasskeyLoginController;
use App\Modules\Foundation\Http\Controllers\OwnerAccountController;
use App\Modules\Foundation\Http\Controllers\OwnerDataExportController;
use App\Modules\Foundation\Http\Controllers\OwnerSettingsController;
use App\Modules\Foundation\Http\Controllers\PasskeyManagementController;
use App\Modules\Foundation\Http\Controllers\SessionController;
use App\Modules\Foundation\Http\Controllers\TwoFactorController;
use App\Modules\Foundation\Http\Resources\OwnerProfileResource;
use App\Modules\Health\Http\Controllers\HealthController;
use App\Modules\Nutrition\Http\Controllers\NutritionController;
use App\Modules\Review\Http\Controllers\WeeklyReviewController as SaveWeeklyReviewController;
use App\Modules\Routines\Http\Controllers\RoutineController;
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
    Route::post('/mobile/auth/login', [MobileCredentialController::class, 'store'])
        ->middleware('throttle:mobile-login')
        ->name('mobile.auth.login');
    Route::post('/mobile/auth/two-factor/challenge', [MobileCredentialController::class, 'challenge'])
        ->middleware('throttle:mobile-two-factor')
        ->name('mobile.auth.two-factor.challenge');
    Route::post('/mobile/auth/two-factor/cancel', [MobileCredentialController::class, 'cancel'])
        ->middleware('throttle:mobile-two-factor')
        ->name('mobile.auth.two-factor.cancel');
    Route::post('/mobile/auth/refresh', [MobileCredentialController::class, 'refresh'])
        ->middleware('throttle:mobile-refresh')
        ->name('mobile.auth.refresh');
    Route::post('/mobile/auth/revoke', [MobileCredentialController::class, 'revoke'])
        ->middleware('throttle:mobile-refresh')
        ->name('mobile.auth.revoke');
    Route::post('/mobile/passkeys', [MobilePasskeyLoginController::class, 'begin'])
        ->middleware('throttle:passkeys')
        ->name('mobile.passkeys.begin');
    Route::post('/mobile/passkeys/prepare', [MobilePasskeyLoginController::class, 'prepare'])
        ->middleware(['web', 'throttle:passkeys'])
        ->name('mobile.passkeys.prepare');
    Route::post('/mobile/passkeys/complete', [MobilePasskeyLoginController::class, 'complete'])
        ->middleware(['web', 'auth:web', 'throttle:passkeys'])
        ->name('mobile.passkeys.complete');
    Route::post('/mobile/passkeys/exchange', [MobilePasskeyLoginController::class, 'exchange'])
        ->middleware('throttle:passkeys')
        ->name('mobile.passkeys.exchange');
    Route::post('/mobile/passkeys/management/redeem', [PasskeyManagementController::class, 'redeemMobileManagement'])
        ->middleware(['web', 'throttle:passkeys'])
        ->name('mobile.passkeys.management.redeem');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [SessionController::class, 'destroy'])->name('auth.logout');
        Route::put('/auth/password', [SessionController::class, 'changePassword'])->name('auth.password.update');
        Route::get('/security/two-factor', [TwoFactorController::class, 'show'])->name('security.two-factor.show');
        Route::post('/security/two-factor/setup', [TwoFactorController::class, 'begin'])->name('security.two-factor.setup');
        Route::post('/security/two-factor/confirm', [TwoFactorController::class, 'confirm'])->name('security.two-factor.confirm');
        Route::delete('/security/two-factor', [TwoFactorController::class, 'destroy'])->name('security.two-factor.destroy');
        Route::get('/security/passkeys', [PasskeyManagementController::class, 'index'])
            ->middleware('web')
            ->name('security.passkeys.index');
        Route::post('/security/passkeys/management-sessions', [PasskeyManagementController::class, 'beginMobileManagement'])->name('security.passkeys.management-sessions.store');
        Route::delete('/security/passkeys/{passkey}', [PasskeyManagementController::class, 'destroy'])->whereNumber('passkey')->name('security.passkeys.destroy');

        Route::get('/me', fn (Request $request): OwnerProfileResource => new OwnerProfileResource($request->user()))
            ->name('me.show');

        Route::get('/settings', [OwnerSettingsController::class, 'show'])->name('settings.show');
        Route::patch('/settings', [OwnerSettingsController::class, 'update'])->name('settings.update');
        Route::get('/backup/status', [BackupStatusController::class, 'show'])->name('backup.status');
        Route::get('/account/export', [OwnerDataExportController::class, 'download'])->name('account.export');
        Route::delete('/account', [OwnerAccountController::class, 'destroy'])->name('account.destroy');
        Route::get('/routines', [RoutineController::class, 'index'])->name('routines.index');
        Route::post('/routines', [RoutineController::class, 'store'])->name('routines.store');
        Route::patch('/routines/{routine}', [RoutineController::class, 'update'])->whereNumber('routine')->name('routines.update');
        Route::post('/routines/{routine}/snooze', [RoutineController::class, 'snooze'])->whereNumber('routine')->name('routines.snooze');
        Route::post('/routines/{routine}/complete', [RoutineController::class, 'complete'])->whereNumber('routine')->name('routines.complete');
        Route::get('/dashboard/weekly-review', [WeeklyReviewController::class, 'show'])->name('dashboard.weekly-review.show');
        Route::put('/dashboard/weekly-review', [SaveWeeklyReviewController::class, 'update'])->name('dashboard.weekly-review.update');

        Route::get('/finance/accounts', [FinanceAccountController::class, 'index'])
            ->name('finance.accounts.index');
        Route::post('/finance/accounts', [FinanceAccountController::class, 'store'])
            ->name('finance.accounts.store');
        Route::patch('/finance/accounts/{account}', [FinanceAccountController::class, 'update'])
            ->whereNumber('account')->name('finance.accounts.update');

        Route::get('/finance/assets', [FinanceAssetController::class, 'index'])->name('finance.assets.index');
        Route::post('/finance/assets', [FinanceAssetController::class, 'store'])->name('finance.assets.store');
        Route::patch('/finance/assets/{asset}', [FinanceAssetController::class, 'update'])->whereNumber('asset')->name('finance.assets.update');
        Route::get('/finance/assets/{asset}/valuations', [FinanceAssetController::class, 'valuations'])->whereNumber('asset')->name('finance.assets.valuations.index');
        Route::post('/finance/assets/{asset}/valuations', [FinanceAssetController::class, 'storeValuation'])->whereNumber('asset')->name('finance.assets.valuations.store');
        Route::get('/finance/net-worth', [FinanceNetWorthController::class, 'show'])->name('finance.net-worth.show');

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
        Route::delete('/health/sources/{source}', [HealthController::class, 'deleteSource']);
        Route::delete('/health/sources/{source}/samples/{externalId}', [HealthController::class, 'deleteSample']);
        Route::post('/health/sync-runs', [HealthController::class, 'startRun']);
        Route::patch('/health/sync-runs/{run}', [HealthController::class, 'finishRun']);
        Route::get('/health/samples', [HealthController::class, 'samples']);
        Route::get('/health/trends', [HealthController::class, 'trends'])->name('health.trends');
        Route::post('/health/samples', [HealthController::class, 'storeSample']);
        Route::post('/health/imports', [HealthController::class, 'import']);
        Route::get('/nutrition/target', [NutritionController::class, 'target']);
        Route::patch('/nutrition/target', [NutritionController::class, 'updateTarget']);
        Route::get('/nutrition/dashboard', [NutritionController::class, 'dashboard']);
        Route::get('/nutrition/recipes', [NutritionController::class, 'recipes']);
        Route::post('/nutrition/recipes', [NutritionController::class, 'storeRecipe']);
        Route::patch('/nutrition/recipes/{recipe}', [NutritionController::class, 'updateRecipe']);
        Route::get('/nutrition/meals', [NutritionController::class, 'meals']);
        Route::post('/nutrition/meals', [NutritionController::class, 'storeMeal']);
        Route::get('/nutrition/plans', [NutritionController::class, 'plans']);
        Route::post('/nutrition/plans', [NutritionController::class, 'storePlanItem']);
        Route::patch('/nutrition/plans/{item}', [NutritionController::class, 'updatePlanItem']);
        Route::post('/nutrition/plans/copy', [NutritionController::class, 'copyWeek']);
        Route::get('/nutrition/shopping-lists', [NutritionController::class, 'shoppingLists']);
        Route::post('/nutrition/shopping-lists/generate', [NutritionController::class, 'generateShoppingList']);
        Route::post('/nutrition/shopping-lists/{list}/items', [NutritionController::class, 'storeShoppingItem']);
        Route::patch('/nutrition/shopping-lists/{list}/items/{item}', [NutritionController::class, 'updateShoppingItem']);
        Route::delete('/nutrition/shopping-lists/{list}/items/{item}', [NutritionController::class, 'destroyShoppingItem']);
        Route::get('/fitness/goals', [FitnessController::class, 'goals']);
        Route::get('/fitness/dashboard', [FitnessDashboardController::class, 'show'])->name('fitness.dashboard.show');
        Route::post('/fitness/goals', [FitnessController::class, 'storeGoal']);
        Route::patch('/fitness/goals/{goal}', [FitnessController::class, 'updateGoal']);
        Route::get('/fitness/progress-photos', [FitnessProgressPhotoController::class, 'index'])->name('fitness.progress-photos.index');
        Route::post('/fitness/progress-photos', [FitnessProgressPhotoController::class, 'store'])->name('fitness.progress-photos.store');
        Route::get('/fitness/progress-photos/monthly-review', [FitnessProgressPhotoController::class, 'monthlyReview'])->name('fitness.progress-photos.monthly-review');
        Route::put('/fitness/progress-photos/monthly-review', [FitnessProgressPhotoController::class, 'completeMonthlyReview'])->name('fitness.progress-photos.monthly-review.update');
        Route::get('/fitness/progress-photos/{photo}/content', [FitnessProgressPhotoController::class, 'content'])->whereNumber('photo')->name('fitness.progress-photos.content');
        Route::delete('/fitness/progress-photos/{photo}', [FitnessProgressPhotoController::class, 'destroy'])->whereNumber('photo')->name('fitness.progress-photos.destroy');
        Route::get('/fitness/body-metrics', [FitnessController::class, 'metrics']);
        Route::post('/fitness/body-metrics', [FitnessController::class, 'storeMetric']);
        Route::get('/fitness/exercises', [FitnessWorkoutController::class, 'exercises']);
        Route::post('/fitness/exercises', [FitnessWorkoutController::class, 'storeExercise']);
        Route::get('/fitness/exercises/{exercise}/recent-performance', [FitnessWorkoutController::class, 'recentPerformance']);
        Route::get('/fitness/workout-templates', [FitnessWorkoutController::class, 'templates']);
        Route::post('/fitness/workout-templates', [FitnessWorkoutController::class, 'storeTemplate']);
        Route::get('/fitness/workout-sessions', [FitnessWorkoutController::class, 'sessions']);
        Route::post('/fitness/workout-sessions', [FitnessWorkoutController::class, 'startSession']);
        Route::post('/fitness/workout-sessions/{session}/exercises', [FitnessWorkoutController::class, 'addExercise']);
        Route::post('/fitness/workout-sessions/{session}/exercises/{exercise}/sets', [FitnessWorkoutController::class, 'addSet']);
        Route::post('/fitness/workout-sessions/{session}/complete', [FitnessWorkoutController::class, 'completeSession']);
    });
});
