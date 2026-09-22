<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Health\Models\HealthSource;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HealthApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_health_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/health/sources')->assertUnauthorized();
        $this->postJson('/api/v1/health/sources')->assertUnauthorized();
        $this->getJson('/api/v1/health/samples')->assertUnauthorized();
    }

    public function test_owner_can_register_source_and_ingest_idempotent_samples(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $source = $this->postJson('/api/v1/health/sources', [
            'key' => 'apple_health_xml', 'name' => 'Apple Health export', 'kind' => 'file',
        ])->assertCreated()->assertJsonPath('data.key', 'apple_health_xml')->json('data.id');
        $run = $this->postJson('/api/v1/health/sync-runs', ['source_id' => $source])
            ->assertCreated()->assertJsonPath('data.status', 'running')->json('data.id');
        $payload = [
            'source_id' => $source, 'sync_run_id' => $run, 'external_id' => 'step-2026-09-15-0900',
            'sample_type' => 'steps', 'value' => '1200.0000', 'unit' => 'count',
            'recorded_at' => '2026-09-15T09:00:00+02:00', 'ended_at' => '2026-09-15T10:00:00+02:00',
            'confidence' => '1.0000', 'metadata' => ['device' => 'iPhone'],
        ];
        $this->postJson('/api/v1/health/samples', $payload)->assertCreated()
            ->assertJsonPath('data.sample_type', 'steps')->assertJsonPath('data.is_manual', false);
        $this->postJson('/api/v1/health/samples', $payload)->assertOk()->assertJsonPath('meta.idempotent', true);
        $this->patchJson("/api/v1/health/sync-runs/{$run}", [
            'status' => 'partial_success', 'imported_count' => 1, 'skipped_count' => 0, 'failed_count' => 0,
        ])->assertOk()->assertJsonPath('data.status', 'partial_success');
        $this->getJson('/api/v1/health/samples?sample_type=steps')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_manual_sample_is_never_overwritten_by_imported_sample(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $source = $this->postJson('/api/v1/health/sources', [
            'key' => 'healthkit:manual-guard', 'name' => 'Apple Health · iPhone', 'kind' => 'healthkit',
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'manual-entry-1', 'sample_type' => 'weight',
            'value' => '80.0000', 'unit' => 'kg',
            'recorded_at' => '2026-09-15T08:00:00+02:00', 'is_manual' => true,
        ])->assertCreated();
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'manual-entry-1', 'sample_type' => 'weight',
            'value' => '75.0000', 'unit' => 'kg', 'recorded_at' => '2026-09-21T08:00:00+02:00',
            'is_manual' => false,
        ])->assertOk()->assertJsonPath('meta.idempotent', true);

        $this->assertDatabaseHas('health_samples', [
            'source_id' => $source,
            'external_id' => 'manual-entry-1',
            'value' => '80.0000',
            'is_manual' => true,
            'conflict_status' => 'conflict',
        ]);

    }

    public function test_owner_can_delete_an_imported_sample_without_touching_manual_records(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $source = $this->postJson('/api/v1/health/sources', [
            'key' => 'healthkit:device-a', 'name' => 'Apple Health · iPhone', 'kind' => 'healthkit',
        ])->assertCreated()->json('data.id');
        $manualSource = $this->postJson('/api/v1/health/sources', [
            'key' => 'manual', 'name' => 'Manual entry', 'kind' => 'manual',
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'healthkit-sample-1', 'sample_type' => 'steps',
            'value' => 1200, 'unit' => 'count', 'recorded_at' => '2026-09-21T09:00:00+02:00',
        ])->assertCreated();
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $manualSource, 'is_manual' => true, 'sample_type' => 'weight',
            'value' => 80, 'unit' => 'kg', 'recorded_at' => '2026-09-21T08:00:00+02:00',
        ])->assertCreated();

        $this->deleteJson("/api/v1/health/sources/{$source}/samples/healthkit-sample-1")
            ->assertNoContent();
        $this->deleteJson("/api/v1/health/sources/{$source}/samples/healthkit-sample-1")
            ->assertNoContent();

        $this->assertDatabaseMissing('health_samples', ['source_id' => $source, 'external_id' => 'healthkit-sample-1']);
        $this->assertDatabaseHas('health_samples', ['source_id' => $manualSource, 'is_manual' => true]);
    }

    public function test_healthkit_deletion_never_removes_manual_samples_or_another_owners_sample(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($owner);
        $source = $this->postJson('/api/v1/health/sources', [
            'key' => 'healthkit:device-manual-guard', 'name' => 'Apple Health · iPhone', 'kind' => 'healthkit',
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'manual-in-healthkit-source', 'sample_type' => 'weight',
            'value' => 80, 'unit' => 'kg', 'recorded_at' => '2026-09-21T08:00:00+02:00', 'is_manual' => true,
        ])->assertCreated();

        Sanctum::actingAs($otherOwner);
        $this->deleteJson("/api/v1/health/sources/{$source}/samples/manual-in-healthkit-source")
            ->assertNotFound();

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/v1/health/sources/{$source}/samples/manual-in-healthkit-source")
            ->assertNoContent();
        $this->assertDatabaseHas('health_samples', [
            'source_id' => $source,
            'external_id' => 'manual-in-healthkit-source',
            'is_manual' => true,
        ]);
    }

    public function test_owner_can_disconnect_healthkit_and_delete_its_imported_samples(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $source = $this->postJson('/api/v1/health/sources', [
            'key' => 'healthkit:device-a', 'name' => 'Apple Health · iPhone', 'kind' => 'healthkit',
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'healthkit-sample-2', 'sample_type' => 'sleep',
            'value' => 1, 'unit' => 'stage', 'recorded_at' => '2026-09-21T09:00:00+02:00',
        ])->assertCreated();
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'manual-healthkit-source', 'is_manual' => true,
            'sample_type' => 'weight', 'value' => 80, 'unit' => 'kg', 'recorded_at' => '2026-09-21T08:00:00+02:00',
        ])->assertCreated();

        $this->deleteJson("/api/v1/health/sources/{$source}")->assertNoContent();

        $this->assertNotNull(HealthSource::query()->findOrFail($source)->revoked_at);
        $this->assertDatabaseMissing('health_samples', ['source_id' => $source, 'external_id' => 'healthkit-sample-2']);
        $this->assertDatabaseHas('health_samples', [
            'source_id' => $source,
            'external_id' => 'manual-healthkit-source',
            'is_manual' => true,
        ]);
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'external_id' => 'late-import', 'sample_type' => 'steps',
            'value' => 1, 'unit' => 'count', 'recorded_at' => '2026-09-21T10:00:00+02:00',
        ])->assertNotFound();

        $this->postJson('/api/v1/health/sources', [
            'key' => 'healthkit:device-a', 'name' => 'Apple Health · iPhone', 'kind' => 'healthkit',
        ])->assertCreated()->assertJsonPath('data.id', $source)->assertJsonPath('data.revoked_at', null);
    }

    public function test_owner_cannot_delete_another_owners_healthkit_source(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($otherOwner);
        $otherSource = $this->postJson('/api/v1/health/sources', [
            'key' => 'healthkit:other-device', 'name' => 'Apple Health · other iPhone', 'kind' => 'healthkit',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/v1/health/sources/{$otherSource}")->assertNotFound();
        $this->assertDatabaseHas('health_sources', ['id' => $otherSource, 'owner_id' => $otherOwner->id]);
    }
}
