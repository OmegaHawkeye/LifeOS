<?php

namespace App\Providers;

use App\Modules\Foundation\Http\Responses\PasskeyLoginResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Laravel\Passkeys\Contracts\PasskeyUser;
use Laravel\Passkeys\Passkey;
use Laravel\Passkeys\Passkeys;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PasskeyLoginResponseContract::class, PasskeyLoginResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Passkeys::authorizeLoginUsing(function (Request $request, PasskeyUser $user, Passkey $passkey): bool {
            return (bool) ($user->settings->passkeys_enabled ?? true);
        });

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

        RateLimiter::for('mobile-login', function (Request $request): Limit {
            $email = Str::lower($request->string('email')->toString());
            $key = hash('sha256', Str::transliterate($email.'|'.$request->ip()));

            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('mobile-refresh', function (Request $request): Limit {
            return Limit::perMinute(30)->by((string) $request->ip());
        });

        RateLimiter::for('mobile-two-factor', function (Request $request): Limit {
            $challenge = $request->string('challenge_token')->toString();
            $key = hash('sha256', $challenge.'|'.$request->ip());

            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('passkeys', function (Request $request): Limit {
            return Limit::perMinute(5)->by((string) $request->ip());
        });
    }
}
