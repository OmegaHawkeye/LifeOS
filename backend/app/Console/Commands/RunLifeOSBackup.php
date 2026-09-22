<?php

namespace App\Console\Commands;

use App\Modules\Foundation\Application\Backup\CreateLifeOSBackup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('lifeos:backup:run')]
#[Description('Create an encrypted local backup of the LifeOS database and private files')]
class RunLifeOSBackup extends Command
{
    public function handle(CreateLifeOSBackup $backup): int
    {
        try {
            $archive = $backup->create();
        } catch (Throwable $exception) {
            Log::error('LifeOS backup failed.', ['exception' => $exception::class]);
            $this->error('LifeOS backup failed. Review the server logs; no private data or secrets were printed.');

            return self::FAILURE;
        }

        $this->info('LifeOS backup created: '.basename($archive));

        return self::SUCCESS;
    }
}
