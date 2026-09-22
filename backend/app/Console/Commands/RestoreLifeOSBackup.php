<?php

namespace App\Console\Commands;

use App\Modules\Foundation\Application\Backup\RestoreLifeOSBackup as RestoreLifeOSBackupService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('lifeos:backup:restore {archive : Backup ZIP file path} {--force : Replace the database and private LifeOS files}')]
#[Description('Restore LifeOS data from an encrypted local backup')]
class RestoreLifeOSBackup extends Command
{
    public function handle(RestoreLifeOSBackupService $restore): int
    {
        if (! $this->option('force')) {
            $this->error('LifeOS backup restore replaces the database and private files and requires --force.');

            return self::FAILURE;
        }

        try {
            $restore->restore((string) $this->argument('archive'));
        } catch (Throwable $exception) {
            Log::error('LifeOS backup restore failed.', ['exception' => $exception::class]);
            $this->error('LifeOS backup restore failed. Review the server logs; no private data or secrets were printed.');

            return self::FAILURE;
        }

        $this->info('LifeOS backup restored successfully.');

        return self::SUCCESS;
    }
}
