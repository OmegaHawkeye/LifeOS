<?php

namespace App\Modules\Foundation\Application\DataExport;

use App\Models\User;
use RuntimeException;
use Throwable;
use ZipArchive;

class BuildOwnerDataArchive
{
    public function __construct(private readonly ExportOwnerData $export) {}

    public function forOwner(User $owner): string
    {
        $temporaryPath = tempnam(sys_get_temp_dir(), 'lifeos-export-');
        if ($temporaryPath === false) {
            throw new RuntimeException('The private data export could not be prepared.');
        }

        chmod($temporaryPath, 0600);
        $archive = new ZipArchive;

        try {
            if ($archive->open($temporaryPath, ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('The private data export archive could not be opened.');
            }

            $generatedAt = now()->utc()->toISOString();
            $export = $this->export->forOwner($owner);
            $filePaths = array_keys($export['files']);
            $manifest = [
                'format' => 'lifeos-owner-data-export',
                'schema_version' => 1,
                'generated_at' => $generatedAt,
                'data_file' => 'data.json',
                'files' => $filePaths,
            ];

            $this->addJsonFile($archive, 'manifest.json', $manifest);
            $this->addJsonFile($archive, 'data.json', $export['data']);

            foreach ($export['files'] as $path => $contents) {
                if (! $archive->addFromString($path, $contents)) {
                    throw new RuntimeException('A private file could not be added to the export archive.');
                }
            }

            if (! $archive->close()) {
                throw new RuntimeException('The private data export archive could not be finalized.');
            }

            return $temporaryPath;
        } catch (Throwable $exception) {
            $archive->close();
            if (is_file($temporaryPath)) {
                unlink($temporaryPath);
            }

            throw $exception;
        }
    }

    /** @param array<string, mixed> $data */
    private function addJsonFile(ZipArchive $archive, string $path, array $data): void
    {
        $json = json_encode(
            $data,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        );

        if (! $archive->addFromString($path, $json)) {
            throw new RuntimeException('The private data export JSON could not be added to the archive.');
        }
    }
}
