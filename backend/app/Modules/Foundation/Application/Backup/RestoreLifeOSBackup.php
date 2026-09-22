<?php

namespace App\Modules\Foundation\Application\Backup;

use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

class RestoreLifeOSBackup
{
    public function restore(string $archivePath): void
    {
        if (config('database.default') !== 'pgsql') {
            throw new RuntimeException('LifeOS backup restore currently requires PostgreSQL.');
        }

        $archiveRealPath = realpath($archivePath);

        if ($archiveRealPath === false || ! is_file($archiveRealPath) || is_link($archivePath)) {
            throw new RuntimeException('The requested LifeOS backup archive does not exist.');
        }

        $workspace = storage_path('framework/backups/restore-'.bin2hex(random_bytes(12)));
        $this->ensureDirectory($workspace);
        $stagedFiles = storage_path('app/fitness-private.restore-'.bin2hex(random_bytes(12)));
        $this->ensureDirectory($stagedFiles);

        try {
            $key = $this->recoveryKey();
            $dumpPath = $workspace.'/database.dump';
            $manifest = $this->extractAndVerify($archiveRealPath, $key, $dumpPath, $stagedFiles);
            $this->restoreDatabase($dumpPath, $workspace);
            $this->replacePrivateFiles($stagedFiles);
            $this->writeStatus([
                'state' => 'ok',
                'last_attempt_at' => now()->toIso8601String(),
                'last_successful_backup_at' => $manifest['created_at'],
                'archive' => basename($archiveRealPath),
                'message' => null,
            ]);
        } catch (Throwable $exception) {
            $this->writeFailedStatus();

            throw $exception;
        } finally {
            File::deleteDirectory($workspace);

            if (is_dir($stagedFiles)) {
                File::deleteDirectory($stagedFiles);
            }
        }
    }

    /** @return array{created_at: string} */
    private function extractAndVerify(string $archivePath, string $key, string $dumpPath, string $stagedFiles): array
    {
        $archive = new ZipArchive;

        if ($archive->open($archivePath, ZipArchive::RDONLY) !== true) {
            throw new RuntimeException('The LifeOS backup archive could not be opened.');
        }

        try {
            $archive->setPassword($key);
            $manifestContent = $archive->getFromName('manifest.json');

            if (! is_string($manifestContent)) {
                throw new RuntimeException('The LifeOS backup manifest is missing or cannot be decrypted.');
            }

            $manifest = json_decode($manifestContent, true, flags: JSON_THROW_ON_ERROR);
            $this->validateManifest($manifest);
            $this->copyArchiveEntry($archive, 'database.dump', $dumpPath);

            if (! hash_equals($manifest['database_sha256'], hash_file('sha256', $dumpPath))) {
                throw new RuntimeException('The LifeOS database backup failed its integrity check.');
            }

            $seenPaths = [];

            foreach ($manifest['files'] as $file) {
                $archiveEntry = $file['path'];
                $relativePath = $this->safeRelativePath($archiveEntry);

                if (isset($seenPaths[$relativePath])) {
                    throw new RuntimeException('The LifeOS backup contains duplicate file paths.');
                }

                $seenPaths[$relativePath] = true;
                $destination = $stagedFiles.'/'.$relativePath;
                $this->ensureDirectory(dirname($destination));
                $this->copyArchiveEntry($archive, $archiveEntry, $destination);

                if (! hash_equals($file['sha256'], hash_file('sha256', $destination)) || filesize($destination) !== $file['size']) {
                    throw new RuntimeException('A private file in the LifeOS backup failed its integrity check.');
                }
            }

            return $manifest;
        } finally {
            $archive->close();
        }
    }

    /** @param mixed $manifest @phpstan-assert array{created_at: string, database_driver: string, database_sha256: string, files: list<array{path: string, sha256: string, size: int}>, format_version: int} $manifest */
    private function validateManifest(mixed $manifest): void
    {
        if (! is_array($manifest)
            || ($manifest['format_version'] ?? null) !== 1
            || ($manifest['database_driver'] ?? null) !== 'pgsql'
            || ! is_string($manifest['created_at'] ?? null)
            || ! is_string($manifest['database_sha256'] ?? null)
            || preg_match('/^[a-f0-9]{64}$/', $manifest['database_sha256']) !== 1
            || ! is_array($manifest['files'] ?? null)
        ) {
            throw new RuntimeException('The LifeOS backup manifest is invalid or unsupported.');
        }

        foreach ($manifest['files'] as $file) {
            if (! is_array($file)
                || ! is_string($file['path'] ?? null)
                || ! is_string($file['sha256'] ?? null)
                || preg_match('/^[a-f0-9]{64}$/', $file['sha256']) !== 1
                || ! is_int($file['size'] ?? null)
                || $file['size'] < 0
            ) {
                throw new RuntimeException('The LifeOS backup contains an invalid file entry.');
            }
        }
    }

    private function safeRelativePath(string $archiveEntry): string
    {
        if (! str_starts_with($archiveEntry, 'files/')) {
            throw new RuntimeException('The LifeOS backup contains an unsupported file path.');
        }

        $relativePath = substr($archiveEntry, strlen('files/'));
        $segments = explode('/', $relativePath);

        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..' || str_contains($segment, '\\')) {
                throw new RuntimeException('The LifeOS backup contains an unsafe file path.');
            }
        }

        return $relativePath;
    }

    private function copyArchiveEntry(ZipArchive $archive, string $entryName, string $destination): void
    {
        $input = $archive->getStream($entryName);

        if ($input === false) {
            throw new RuntimeException('A required LifeOS backup entry is missing or cannot be decrypted.');
        }

        $output = fopen($destination, 'xb');

        if ($output === false) {
            fclose($input);

            throw new RuntimeException('A LifeOS backup entry could not be staged for restore.');
        }

        try {
            if (stream_copy_to_stream($input, $output) === false) {
                throw new RuntimeException('A LifeOS backup entry could not be read.');
            }
        } finally {
            fclose($input);
            fclose($output);
        }

        chmod($destination, 0600);
    }

    private function restoreDatabase(string $dumpPath, string $workspace): void
    {
        $database = config('database.connections.pgsql');
        $environment = $this->pgPassEnvironment($database, $workspace);
        $process = new Process([
            (string) config('lifeos.backups.pg_restore_path'),
            '--clean',
            '--if-exists',
            '--no-owner',
            '--no-privileges',
            '--exit-on-error',
            '--single-transaction',
            '--no-password',
            '--host='.(string) ($database['host'] ?? 'localhost'),
            '--port='.(string) ($database['port'] ?? 5432),
            '--username='.(string) $database['username'],
            '--dbname='.(string) $database['database'],
            $dumpPath,
        ], base_path(), $environment, timeout: 3600);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('The PostgreSQL restore process failed.');
        }
    }

    /**
     * @param  array<string, mixed>  $database
     * @return array<string, string>
     */
    private function pgPassEnvironment(array $database, string $workspace): array
    {
        $password = (string) ($database['password'] ?? '');

        if ($password === '') {
            return [];
        }

        $pgPassPath = $workspace.'/pgpass';
        $entry = implode(':', [
            $this->escapePgPass((string) ($database['host'] ?? 'localhost')),
            $this->escapePgPass((string) ($database['port'] ?? 5432)),
            $this->escapePgPass((string) $database['database']),
            $this->escapePgPass((string) $database['username']),
            $this->escapePgPass($password),
        ]);
        file_put_contents($pgPassPath, $entry.PHP_EOL, LOCK_EX);
        chmod($pgPassPath, 0600);

        return ['PGPASSFILE' => $pgPassPath];
    }

    private function replacePrivateFiles(string $stagedFiles): void
    {
        $target = storage_path('app/fitness-private');
        $previous = storage_path('app/fitness-private.previous-'.bin2hex(random_bytes(8)));
        $movedPrevious = false;

        if (is_link($target)) {
            throw new RuntimeException('The private LifeOS files directory cannot be a symbolic link during restore.');
        }

        if (is_dir($target)) {
            if (! rename($target, $previous)) {
                throw new RuntimeException('The existing private LifeOS files could not be preserved for restore.');
            }

            $movedPrevious = true;
        }

        if (! rename($stagedFiles, $target)) {
            if ($movedPrevious) {
                rename($previous, $target);
            }

            throw new RuntimeException('The private LifeOS files could not be restored.');
        }

        if ($movedPrevious) {
            File::deleteDirectory($previous);
        }
    }

    private function recoveryKey(): string
    {
        $keyPath = (string) config('lifeos.backups.key_path');

        if (! is_file($keyPath) || ! is_readable($keyPath)) {
            throw new RuntimeException('No readable backup recovery key exists.');
        }

        $key = trim((string) file_get_contents($keyPath));

        if (strlen(base64_decode($key, true) ?: '') !== 32) {
            throw new RuntimeException('The backup recovery key file is invalid.');
        }

        return $key;
    }

    /** @param array{state: string, last_attempt_at: string, last_successful_backup_at: ?string, archive: ?string, message: ?string} $status */
    private function writeStatus(array $status): void
    {
        $path = (string) config('lifeos.backups.status_path');
        $this->ensureDirectory(dirname($path));
        file_put_contents($path.'.tmp', json_encode($status, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), LOCK_EX);
        chmod($path.'.tmp', 0600);
        rename($path.'.tmp', $path);
    }

    private function writeFailedStatus(): void
    {
        $path = (string) config('lifeos.backups.status_path');
        $previous = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
        $this->writeStatus([
            'state' => 'failed',
            'last_attempt_at' => now()->toIso8601String(),
            'last_successful_backup_at' => is_array($previous) ? ($previous['last_successful_backup_at'] ?? null) : null,
            'archive' => null,
            'message' => 'Restore failed. Review the LifeOS server log for details.',
        ]);
    }

    private function escapePgPass(string $value): string
    {
        return str_replace(['\\', ':'], ['\\\\', '\\:'], $value);
    }

    private function ensureDirectory(string $path): void
    {
        if (is_dir($path)) {
            return;
        }

        if (! mkdir($path, 0700, true) && ! is_dir($path)) {
            throw new RuntimeException('A local LifeOS restore directory could not be created.');
        }
    }
}
