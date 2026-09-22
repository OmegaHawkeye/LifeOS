<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('lifeos:backup:status')]
#[Description('Show the last LifeOS backup attempt and its outcome')]
class ShowLifeOSBackupStatus extends Command
{
    public function handle(): int
    {
        $path = (string) config('lifeos.backups.status_path');

        if (! is_file($path)) {
            $this->warn('No LifeOS backup attempt has been recorded yet.');

            return self::SUCCESS;
        }

        $status = json_decode((string) file_get_contents($path), true);

        if (! is_array($status)) {
            $this->error('LifeOS backup status is unreadable.');

            return self::FAILURE;
        }

        $this->line('Status: '.($status['state'] ?? 'unknown'));
        $this->line('Last attempt: '.($status['last_attempt_at'] ?? 'unknown'));
        $this->line('Last successful backup: '.($status['last_successful_backup_at'] ?? 'none'));

        if (isset($status['archive'])) {
            $this->line('Archive: '.$status['archive']);
        }

        if (isset($status['message'])) {
            $this->warn($status['message']);
        }

        return ($status['state'] ?? null) === 'failed' ? self::FAILURE : self::SUCCESS;
    }
}
