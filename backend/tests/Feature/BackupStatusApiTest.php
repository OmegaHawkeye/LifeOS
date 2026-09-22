<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BackupStatusApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function tearDown(): void
    {
        $path = storage_path('framework/testing/backup-status.json');

        if (is_file($path)) {
            unlink($path);
        }

        parent::tearDown();
    }

    public function test_backup_status_requires_authentication_and_exposes_only_safe_status_fields(): void
    {
        $path = storage_path('framework/testing/backup-status.json');

        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }

        config()->set('lifeos.backups.status_path', $path);
        config()->set('lifeos.backups.retention_days', 30);
        file_put_contents($path, json_encode([
            'state' => 'failed',
            'last_attempt_at' => '2026-09-21T02:00:00+02:00',
            'last_successful_backup_at' => '2026-09-20T02:00:00+02:00',
            'archive' => '/private/nas/lifeos-secret.zip',
            'message' => 'Database password: secret-value',
        ], JSON_THROW_ON_ERROR));

        $this->getJson('/api/v1/backup/status')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/backup/status')
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertExactJson([
                'data' => [
                    'status' => 'failed',
                    'last_attempt_at' => '2026-09-21T02:00:00+02:00',
                    'last_successful_backup_at' => '2026-09-20T02:00:00+02:00',
                    'retention_days' => 30,
                    'scheduled_time' => '02:00',
                ],
            ])
            ->assertDontSee('secret-value')
            ->assertDontSee('/private/nas');
    }
}
