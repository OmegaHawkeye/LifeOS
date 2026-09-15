<?php

namespace Tests\Feature;

use App\Models\User;
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
            'key' => 'manual', 'name' => 'Manual entry', 'kind' => 'manual',
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/health/samples', [
            'source_id' => $source, 'sample_type' => 'weight', 'value' => '80.0000', 'unit' => 'kg',
            'recorded_at' => '2026-09-15T08:00:00+02:00', 'is_manual' => true,
        ])->assertCreated();
        $this->getJson('/api/v1/health/samples?sample_type=weight')->assertOk()
            ->assertJsonPath('data.0.value', '80.0000')->assertJsonPath('data.0.is_manual', true);

    }
}
