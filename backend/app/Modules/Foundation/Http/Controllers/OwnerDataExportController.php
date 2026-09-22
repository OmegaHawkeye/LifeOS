<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Modules\Foundation\Application\DataExport\BuildOwnerDataArchive;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OwnerDataExportController
{
    public function __construct(private readonly BuildOwnerDataArchive $archive) {}

    public function download(Request $request): StreamedResponse
    {
        $owner = $request->user();
        if ($owner === null) {
            throw new RuntimeException('The authenticated owner is required to export data.');
        }

        $archivePath = $this->archive->forOwner($owner);
        $fileName = 'lifeos-export-'.now()->utc()->format('Y-m-d').'.zip';

        return response()->streamDownload(function () use ($archivePath): void {
            $file = fopen($archivePath, 'rb');
            if ($file === false) {
                if (is_file($archivePath)) {
                    unlink($archivePath);
                }

                throw new RuntimeException('The private data export archive could not be read.');
            }

            try {
                fpassthru($file);
            } finally {
                fclose($file);
                if (is_file($archivePath)) {
                    unlink($archivePath);
                }
            }
        }, $fileName, [
            'Content-Type' => 'application/zip',
            'Cache-Control' => 'private, no-store',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
