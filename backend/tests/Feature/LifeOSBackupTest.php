<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;
use ZipArchive;

class LifeOSBackupTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function tearDown(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');

        if (is_file($keyPath)) {
            unlink($keyPath);
        }

        $backupDirectory = storage_path('framework/testing/lifeos-backups');

        if (is_dir($backupDirectory)) {
            foreach (glob($backupDirectory.'/*') ?: [] as $backup) {
                if (is_file($backup)) {
                    unlink($backup);
                }
            }

            rmdir($backupDirectory);
        }

        $privateFile = storage_path('app/fitness-private/backup-test.txt');

        if (is_file($privateFile)) {
            unlink($privateFile);
        }

        $dumpPath = storage_path('framework/testing/fake-pg-dump');

        if (is_file($dumpPath)) {
            unlink($dumpPath);
        }

        $restorePath = storage_path('framework/testing/fake-pg-restore');

        if (is_file($restorePath)) {
            unlink($restorePath);
        }

        $statusPath = storage_path('framework/testing/backup-status.json');

        if (is_file($statusPath)) {
            unlink($statusPath);
        }

        parent::tearDown();
    }

    public function test_recovery_key_command_creates_a_private_random_key_and_can_reveal_it_on_request(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        config()->set('lifeos.backups.key_path', $keyPath);

        $this->artisan('lifeos:backup:key')
            ->expectsOutputToContain('Recovery key created')
            ->assertExitCode(0);

        $this->assertFileExists($keyPath);
        $key = trim((string) file_get_contents($keyPath));
        $this->assertSame(32, strlen(base64_decode($key, true) ?: ''));

        $this->artisan('lifeos:backup:key --show')
            ->expectsOutputToContain($key)
            ->assertExitCode(0);
    }

    public function test_recovery_key_command_does_not_replace_an_existing_key(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        $directory = dirname($keyPath);

        if (! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }

        file_put_contents($keyPath, 'existing-key');
        config()->set('lifeos.backups.key_path', $keyPath);

        $this->artisan('lifeos:backup:key')
            ->expectsOutputToContain('already exists')
            ->assertExitCode(1);

        $this->assertSame('existing-key', file_get_contents($keyPath));
    }

    public function test_backup_command_creates_an_encrypted_archive_with_database_and_private_files(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        $backupDirectory = storage_path('framework/testing/lifeos-backups');
        $dumpPath = storage_path('framework/testing/fake-pg-dump');
        $privateFile = storage_path('app/fitness-private/backup-test.txt');
        $this->configureBackup($keyPath, $backupDirectory, $dumpPath);
        $this->writeFakePgDump($dumpPath);
        if (! is_dir(dirname($privateFile))) {
            mkdir(dirname($privateFile), 0700, true);
        }
        file_put_contents($privateFile, 'private progress photo metadata');
        file_put_contents($keyPath, base64_encode(str_repeat('r', 32)));

        $this->artisan('lifeos:backup:run')
            ->expectsOutputToContain('LifeOS backup created')
            ->assertExitCode(0);

        $archives = glob($backupDirectory.'/lifeos-*.zip') ?: [];
        $this->assertCount(1, $archives);

        $archive = new ZipArchive;
        $this->assertTrue($archive->open($archives[0]));
        $archive->setPassword(base64_encode(str_repeat('r', 32)));
        $this->assertSame('database dump fixture', $archive->getFromName('database.dump'));
        $this->assertSame('private progress photo metadata', $archive->getFromName('files/backup-test.txt'));
        $manifest = json_decode((string) $archive->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('pgsql', $manifest['database_driver']);
        $this->assertSame('files/backup-test.txt', $manifest['files'][0]['path']);
        $archive->close();
    }

    public function test_restore_requires_explicit_confirmation_before_replacing_existing_data(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        $backupDirectory = storage_path('framework/testing/lifeos-backups');
        $dumpPath = storage_path('framework/testing/fake-pg-dump');
        $restorePath = storage_path('framework/testing/fake-pg-restore');
        $this->configureBackup($keyPath, $backupDirectory, $dumpPath, $restorePath);
        $this->writeFakePgDump($dumpPath);
        $this->writeFakePgRestore($restorePath);
        file_put_contents($keyPath, base64_encode(str_repeat('r', 32)));

        $this->artisan('lifeos:backup:restore /tmp/not-used.zip')
            ->expectsOutputToContain('requires --force')
            ->assertExitCode(1);
    }

    public function test_restore_validates_and_restores_the_database_dump_and_private_files(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        $backupDirectory = storage_path('framework/testing/lifeos-backups');
        $dumpPath = storage_path('framework/testing/fake-pg-dump');
        $restorePath = storage_path('framework/testing/fake-pg-restore');
        $privateFile = storage_path('app/fitness-private/backup-test.txt');
        $this->configureBackup($keyPath, $backupDirectory, $dumpPath, $restorePath);
        $this->writeFakePgDump($dumpPath);
        $this->writeFakePgRestore($restorePath);
        if (! is_dir(dirname($privateFile))) {
            mkdir(dirname($privateFile), 0700, true);
        }
        file_put_contents($privateFile, 'private progress photo metadata');
        file_put_contents($keyPath, base64_encode(str_repeat('r', 32)));
        $this->artisan('lifeos:backup:run')->assertExitCode(0);
        $archivePath = (glob($backupDirectory.'/lifeos-*.zip') ?: [])[0];
        file_put_contents($privateFile, 'newer local file');

        $this->artisan('lifeos:backup:restore '.$archivePath.' --force')
            ->expectsOutputToContain('LifeOS backup restored')
            ->assertExitCode(0);

        $this->assertSame('private progress photo metadata', file_get_contents($privateFile));
    }

    public function test_scheduler_runs_an_automatic_backup_every_day(): void
    {
        $this->artisan('schedule:list')
            ->expectsOutputToContain('lifeos:backup:run')
            ->assertExitCode(0);
    }

    public function test_successful_backup_removes_archives_older_than_the_configured_retention(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        $backupDirectory = storage_path('framework/testing/lifeos-backups');
        $dumpPath = storage_path('framework/testing/fake-pg-dump');
        $this->configureBackup($keyPath, $backupDirectory, $dumpPath);
        $this->writeFakePgDump($dumpPath);
        file_put_contents($keyPath, base64_encode(str_repeat('r', 32)));
        mkdir($backupDirectory, 0700, true);
        $expiredArchive = $backupDirectory.'/lifeos-expired.zip';
        file_put_contents($expiredArchive, 'expired');
        touch($expiredArchive, now()->subDays(31)->getTimestamp());

        $this->artisan('lifeos:backup:run')->assertExitCode(0);

        $this->assertFileDoesNotExist($expiredArchive);
        $this->assertCount(1, glob($backupDirectory.'/lifeos-*.zip') ?: []);
    }

    public function test_failed_backup_is_visible_without_logging_credentials_or_private_data(): void
    {
        $keyPath = storage_path('framework/testing/backup-recovery.key');
        $backupDirectory = storage_path('framework/testing/lifeos-backups');
        $dumpPath = storage_path('framework/testing/fake-pg-dump');
        $this->configureBackup($keyPath, $backupDirectory, $dumpPath);
        file_put_contents($keyPath, base64_encode(str_repeat('r', 32)));
        file_put_contents($dumpPath, "#!/bin/sh\necho test-password >&2\nexit 1\n");
        chmod($dumpPath, 0700);

        $this->artisan('lifeos:backup:run')
            ->expectsOutputToContain('LifeOS backup failed')
            ->assertExitCode(1);

        $status = (string) file_get_contents(storage_path('framework/testing/backup-status.json'));
        $this->assertStringContainsString('"state": "failed"', $status);
        $this->assertStringNotContainsString('test-password', $status);

        $this->artisan('lifeos:backup:status')
            ->expectsOutputToContain('Status: failed')
            ->expectsOutputToContain('Last successful backup: none')
            ->assertExitCode(1);
    }

    private function configureBackup(string $keyPath, string $backupDirectory, string $dumpPath, ?string $restorePath = null): void
    {
        config()->set('lifeos.backups.key_path', $keyPath);
        config()->set('lifeos.backups.directory', $backupDirectory);
        config()->set('lifeos.backups.status_path', storage_path('framework/testing/backup-status.json'));
        config()->set('lifeos.backups.pg_dump_path', $dumpPath);
        config()->set('lifeos.backups.pg_restore_path', $restorePath ?? 'pg_restore');
        config()->set('database.default', 'pgsql');
        config()->set('database.connections.pgsql.host', '127.0.0.1');
        config()->set('database.connections.pgsql.port', '5432');
        config()->set('database.connections.pgsql.database', 'lifeos_test');
        config()->set('database.connections.pgsql.username', 'lifeos');
        config()->set('database.connections.pgsql.password', 'test-password');
    }

    private function writeFakePgDump(string $path): void
    {
        $script = <<<'SH'
#!/bin/sh
for argument in "$@"; do
    case "$argument" in
        --file=*) dump_path="${argument#--file=}" ;;
    esac
done
printf 'database dump fixture' > "$dump_path"
SH;

        file_put_contents($path, $script);
        chmod($path, 0700);
    }

    private function writeFakePgRestore(string $path): void
    {
        $script = <<<'SH'
#!/bin/sh
exit 0
SH;

        file_put_contents($path, $script);
        chmod($path, 0700);
    }
}
