<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use RuntimeException;

#[Signature('lifeos:backup:key {--show : Reveal the existing recovery key in this terminal}')]
#[Description('Create or reveal the encryption key required to recover LifeOS backups')]
class ManageBackupRecoveryKey extends Command
{
    public function handle(): int
    {
        $keyPath = (string) config('lifeos.backups.key_path');

        if ($this->option('show')) {
            return $this->showKey($keyPath);
        }

        if (file_exists($keyPath)) {
            $this->error('A backup recovery key already exists. Use --show to reveal it; this command never replaces it.');

            return self::FAILURE;
        }

        $directory = dirname($keyPath);

        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            $this->error('The backup recovery key directory could not be created.');

            return self::FAILURE;
        }

        $key = base64_encode(random_bytes(32));
        $handle = @fopen($keyPath, 'x');

        if ($handle === false) {
            $this->error('The backup recovery key could not be created.');

            return self::FAILURE;
        }

        try {
            if (fwrite($handle, $key.PHP_EOL) === false) {
                throw new RuntimeException('The recovery key could not be written.');
            }
        } catch (RuntimeException) {
            fclose($handle);
            @unlink($keyPath);
            $this->error('The backup recovery key could not be saved.');

            return self::FAILURE;
        }

        fclose($handle);
        chmod($keyPath, 0600);

        $this->warn('Recovery key created. Save it somewhere separate from your LifeOS server and backup drive; it is required to restore encrypted backups.');
        $this->line($key);

        return self::SUCCESS;
    }

    private function showKey(string $keyPath): int
    {
        if (! is_file($keyPath) || ! is_readable($keyPath)) {
            $this->error('No readable backup recovery key exists. Create one with lifeos:backup:key.');

            return self::FAILURE;
        }

        $key = trim((string) file_get_contents($keyPath));

        if (strlen(base64_decode($key, true) ?: '') !== 32) {
            $this->error('The backup recovery key file is invalid.');

            return self::FAILURE;
        }

        $this->warn('Keep this recovery key separate from your LifeOS server and backup drive.');
        $this->line($key);

        return self::SUCCESS;
    }
}
