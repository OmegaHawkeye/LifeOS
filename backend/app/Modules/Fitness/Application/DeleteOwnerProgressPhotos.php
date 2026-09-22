<?php

namespace App\Modules\Fitness\Application;

use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DeleteOwnerProgressPhotos
{
    public function forOwner(int|string $ownerId): void
    {
        $directory = "owners/{$ownerId}/progress-photos";

        if (! Storage::disk('fitness-private')->deleteDirectory($directory)) {
            throw new RuntimeException('The owner progress photos could not be deleted.');
        }
    }
}
