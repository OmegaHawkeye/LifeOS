<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Foundation\Models\OwnerSettings;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

#[Signature('lifeos:owner {--reset-password : Reset the existing owner password and revoke active sessions and tokens}')]
#[Description('Provision the initial LifeOS owner or recover owner access')]
class ProvisionOwner extends Command
{
    public function handle(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('This command needs an interactive terminal so passwords are never passed as command-line arguments.');

            return self::FAILURE;
        }

        $owner = User::query()->first();

        if ($this->option('reset-password')) {
            return $this->resetPassword($owner);
        }

        if ($owner !== null) {
            $this->error('The owner account already exists. Use --reset-password to recover access.');

            return self::FAILURE;
        }

        $name = trim($this->ask('Owner name'));
        $email = mb_strtolower(trim($this->ask('Owner email')));

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::INVALID;
        }

        $password = $this->confirmedPassword('Owner password');

        if ($password === null) {
            return self::INVALID;
        }

        $owner = DB::transaction(function () use ($name, $email, $password): User {
            $owner = User::query()->create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
            ]);
            $owner->settings()->create(OwnerSettings::defaults());

            return $owner;
        });

        $this->info("LifeOS owner provisioned for {$owner->email}.");

        return self::SUCCESS;
    }

    private function resetPassword(?User $owner): int
    {
        if ($owner === null) {
            $this->error('No owner account exists yet. Run lifeos:owner to provision the initial account.');

            return self::FAILURE;
        }

        if (User::query()->count() !== 1) {
            $this->error('Password recovery is restricted to an installation with exactly one owner account.');

            return self::FAILURE;
        }

        $password = $this->confirmedPassword('New owner password');

        if ($password === null) {
            return self::INVALID;
        }

        DB::transaction(function () use ($owner, $password): void {
            $owner->forceFill([
                'password' => $password,
                'two_factor_secret' => null,
                'two_factor_confirmed_at' => null,
            ])->save();
            $owner->tokens()->delete();
            DB::table(config('session.table'))
                ->where('user_id', $owner->getKey())
                ->delete();
        });

        $this->info('Owner password updated; active sessions and API tokens were revoked.');

        return self::SUCCESS;
    }

    private function confirmedPassword(string $prompt): ?string
    {
        $password = $this->secret($prompt);
        $confirmation = $this->secret('Confirm password');

        if ($password === null || mb_strlen($password) < 12) {
            $this->error('The password must contain at least 12 characters.');

            return null;
        }

        if (! hash_equals($password, $confirmation ?? '')) {
            $this->error('The passwords do not match.');

            return null;
        }

        return $password;
    }
}
