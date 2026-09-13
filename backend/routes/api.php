<?php

use App\Modules\Foundation\Http\Resources\OwnerProfileResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('/readiness', fn (): array => [
        'service' => 'lifeos-api',
        'status' => 'ok',
    ])->name('readiness');

    Route::get('/me', fn (Request $request): OwnerProfileResource => new OwnerProfileResource($request->user()))
        ->middleware('auth:sanctum')
        ->name('me.show');
});
