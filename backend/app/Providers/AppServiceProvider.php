<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $email = Str::lower($request->string('email')->toString());
            $key = hash('sha256', Str::transliterate($email.'|'.$request->ip()));

            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('two-factor', function (Request $request): Limit {
            $pendingUserId = (string) $request->session()->get('auth.pending_user_id', 'guest');
            $key = hash('sha256', $pendingUserId.'|'.$request->ip());

            return Limit::perMinute(5)->by($key);
        });
    }
}
