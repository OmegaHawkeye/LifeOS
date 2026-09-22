<?php

namespace App\Modules\Foundation\Application\Backup;

use FilesystemIterator;
use Illuminate\Support\Facades\File;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

class CreateLifeOSBackup
{
    public function create(): string
    {
        $backupDirectory = (string) config('lifeos.backups.directory');
        $retentionDays = (int) config('lifeos.backups.retention_days');

        if ($retentionDays < 1 || $retentionDays > 730) {
            throw new RuntimeException('Backup retention must be between 1 and 730 days.');
        }

        if (config('database.default') !== 'pgsql') {
            throw new RuntimeException('Automated LifeOS backups currently require PostgreSQL.');
        }

        $key = $this->recoveryKey();
        $this->ensureDirectory($backupDirectory);

        $workspace = storage_path('framework/backups/'.bin2hex(random_bytes(12)));
        $this->ensureDirectory($workspace);

        $archivePath = $backupDirectory.'/lifeos-'.now()->utc()->format('Ymd-His').'-'.bin2hex(random_bytes(4)).'.zip';
        $temporaryArchivePath = $archivePath.'.tmp';

        try {
            $dumpPath = $workspace.'/database.dump';
            $this->dumpDatabase($dumpPath, $workspace);
            $manifest = $this->manifest($dumpPath);
            $this->buildArchive($temporaryArchivePath, $dumpPath, $key, $manifest);
            $this->verifyArchive($temporaryArchivePath, $key, $manifest);

            if (! rename($temporaryArchivePath, $archivePath)) {
                throw new RuntimeException('The LifeOS backup archive could not be finalized.');
            }

            $this->rotateBackups($backupDirectory, $retentionDays);
            $this->writeStatus([
                'state' => 'ok',
                'last_attempt_at' => now()->toIso8601String(),
                'last_successful_backup_at' => now()->toIso8601String(),
                'archive' => basename($archivePath),
                'message' => null,
            ]);

            return $archivePath;
        } catch (Throwable $exception) {
            $this->writeStatus([
                'state' => 'failed',
                'last_attempt_at' => now()->toIso8601String(),
                'last_successful_backup_at' => $this->lastSuccessfulBackupAt(),
                'archive' => null,
                'message' => 'Backup failed. Review the LifeOS server log for details.',
            ]);

            throw $exception;
        } finally {
            File::deleteDirectory($workspace);

            if (is_file($temporaryArchivePath)) {
                unlink($temporaryArchivePath);
            }
        }
    }

    /** @return array{created_at: string, database_driver: string, database_sha256: string, files: list<array{path: string, sha256: string, size: int}>, format_version: int} */
    private function manifest(string $dumpPath): array
    {
        return [
            'format_version' => 1,
            'created_at' => now()->utc()->toIso8601String(),
            'database_driver' => 'pgsql',
            'database_sha256' => hash_file('sha256', $dumpPath),
            'files' => $this->privateFileManifest(),
        ];
    }

    /** @return list<array{path: string, sha256: string, size: int}> */
    private function privateFileManifest(): array
    {
        $directory = storage_path('app/fitness-private');

        if (! is_dir($directory)) {
            return [];
        }

        $manifest = [];
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS));

        foreach ($iterator as $file) {
            if (! $file->isFile() || $file->isLink()) {
                continue;
            }

            $path = 'files/'.str_replace(DIRECTORY_SEPARATOR, '/', substr($file->getPathname(), strlen($directory) + 1));
            $manifest[] = [
                'path' => $path,
                'sha256' => hash_file('sha256', $file->getPathname()),
                'size' => $file->getSize(),
            ];
        }

        return $manifest;
    }

    private function dumpDatabase(string $dumpPath, string $workspace): void
    {
        $database = config('database.connections.pgsql');
        $pgPassPath = $workspace.'/pgpass';
        $password = (string) ($database['password'] ?? '');

        if ($password !== '') {
            $entry = implode(':', [
                $this->escapePgPass((string) ($database['host'] ?? 'localhost')),
                $this->escapePgPass((string) ($database['port'] ?? 5432)),
                $this->escapePgPass((string) $database['database']),
                $this->escapePgPass((string) $database['username']),
                $this->escapePgPass($password),
            ]);
            file_put_contents($pgPassPath, $entry.PHP_EOL, LOCK_EX);
            chmod($pgPassPath, 0600);
        }

        $arguments = [
            (string) config('lifeos.backups.pg_dump_path'),
            '--format=custom',
            '--no-owner',
            '--no-privileges',
            '--no-password',
            '--host='.(string) ($database['host'] ?? 'localhost'),
            '--port='.(string) ($database['port'] ?? 5432),
            '--username='.(string) $database['username'],
            '--dbname='.(string) $database['database'],
            '--file='.$dumpPath,
        ];
        $environment = $password === '' ? [] : ['PGPASSFILE' => $pgPassPath];
        $process = new Process($arguments, base_path(), $environment, timeout: 3600);
        $process->run();

        if (! $process->isSuccessful() || ! is_file($dumpPath) || filesize($dumpPath) === 0) {
            throw new RuntimeException('The PostgreSQL backup process failed.');
        }
    }

    /** @param array{created_at: string, database_driver: string, files: list<array{path: string, sha256: string, size: int}>, format_version: int} $manifest */
    private function buildArchive(string $path, string $dumpPath, string $key, array $manifest): void
    {
        $archive = new ZipArchive;

        if ($archive->open($path, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
            throw new RuntimeException('The LifeOS backup archive could not be opened.');
        }

        try {
            $archive->setPassword($key);
            $this->addEncryptedFile($archive, $dumpPath, 'database.dump');

            foreach ($manifest['files'] as $file) {
                $relativePath = substr($file['path'], strlen('files/'));
                $sourcePath = storage_path('app/fitness-private/'.$relativePath);
                $this->addEncryptedFile($archive, $sourcePath, $file['path']);
            }

            $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);

            if (! $archive->addFromString('manifest.json', $manifestJson) || ! $archive->setEncryptionName('manifest.json', ZipArchive::EM_AES_256)) {
                throw new RuntimeException('The LifeOS backup manifest could not be protected.');
            }

            if (! $archive->close()) {
                throw new RuntimeException('The LifeOS backup archive could not be finalized.');
            }
        } catch (Throwable $exception) {
            $archive->close();

            throw $exception;
        }
    }

    private function addEncryptedFile(ZipArchive $archive, string $sourcePath, string $archivePath): void
    {
        if (! $archive->addFile($sourcePath, $archivePath) || ! $archive->setEncryptionName($archivePath, ZipArchive::EM_AES_256)) {
            throw new RuntimeException('A private file could not be added to the LifeOS backup.');
        }
    }

    /** @param array{created_at: string, database_driver: string, database_sha256: string, files: list<array{path: string, sha256: string, size: int}>, format_version: int} $manifest */
    private function verifyArchive(string $path, string $key, array $manifest): void
    {
        $archive = new ZipArchive;

        if ($archive->open($path, ZipArchive::RDONLY) !== true) {
            throw new RuntimeException('The completed LifeOS backup archive could not be verified.');
        }

        try {
            $archive->setPassword($key);
            $expected = ['database.dump' => $manifest['database_sha256']];

            foreach ($manifest['files'] as $file) {
                $expected[$file['path']] = $file['sha256'];
            }

            foreach ($expected as $entry => $checksum) {
                $stream = $archive->getStream($entry);

                if ($stream === false) {
                    throw new RuntimeException('A LifeOS backup entry could not be verified.');
                }

                $context = hash_init('sha256');

                while (! feof($stream)) {
                    $chunk = fread($stream, 1024 * 1024);

                    if ($chunk === false) {
                        fclose($stream);

                        throw new RuntimeException('A LifeOS backup entry could not be verified.');
                    }

                    hash_update($context, $chunk);
                }

                fclose($stream);

                if (! hash_equals($checksum, hash_final($context))) {
                    throw new RuntimeException('LifeOS data changed while the backup was being created.');
                }
            }
        } finally {
            $archive->close();
        }
    }

    private function recoveryKey(): string
    {
        $keyPath = (string) config('lifeos.backups.key_path');

        if (! is_file($keyPath) || ! is_readable($keyPath)) {
            throw new RuntimeException('No readable backup recovery key exists. Run lifeos:backup:key first.');
        }

        $key = trim((string) file_get_contents($keyPath));

        if (strlen(base64_decode($key, true) ?: '') !== 32) {
            throw new RuntimeException('The backup recovery key file is invalid.');
        }

        return $key;
    }

    private function rotateBackups(string $directory, int $retentionDays): void
    {
        $expiry = now()->subDays($retentionDays)->getTimestamp();

        foreach (glob($directory.'/lifeos-*.zip') ?: [] as $path) {
            if (is_file($path) && ! is_link($path) && filemtime($path) < $expiry) {
                unlink($path);
            }
        }
    }

    /** @param array{state: string, last_attempt_at: string, last_successful_backup_at: ?string, archive: ?string, message: ?string} $status */
    private function writeStatus(array $status): void
    {
        $path = (string) config('lifeos.backups.status_path');
        $this->ensureDirectory(dirname($path));
        $temporaryPath = $path.'.tmp';
        file_put_contents($temporaryPath, json_encode($status, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), LOCK_EX);
        chmod($temporaryPath, 0600);
        rename($temporaryPath, $path);
    }

    private function lastSuccessfulBackupAt(): ?string
    {
        $path = (string) config('lifeos.backups.status_path');

        if (! is_file($path)) {
            return null;
        }

        $status = json_decode((string) file_get_contents($path), true);

        return is_array($status) ? ($status['last_successful_backup_at'] ?? null) : null;
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
            throw new RuntimeException('A local LifeOS backup directory could not be created.');
        }
    }
}
