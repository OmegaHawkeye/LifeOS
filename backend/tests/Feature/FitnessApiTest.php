<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FitnessApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_owner_can_record_and_filter_manual_body_metrics(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/fitness/body-metrics', [
            'metric_type' => 'weight',
            'value' => 82.4,
            'unit' => 'kg',
            'measured_at' => '2026-09-17T07:00:00Z',
            'notes' => 'Morning measurement',
        ])->assertCreated()
            ->assertJsonPath('data.metric_type', 'weight')
            ->assertJsonPath('data.source', 'manual')
            ->assertJsonPath('data.notes', 'Morning measurement');

        $this->getJson('/api/v1/fitness/body-metrics?metric_type=weight&days=30')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_manual_and_imported_metrics_coexist_and_are_owner_scoped(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/fitness/body-metrics', [
            'metric_type' => 'weight',
            'value' => 82.4,
            'unit' => 'kg',
            'measured_at' => '2026-09-17T07:00:00Z',
        ])->assertCreated();

        FitnessBodyMetric::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'metric_type' => 'weight',
            'value' => 82.1,
            'unit' => 'kg',
            'measured_at' => '2026-09-17T07:00:00Z',
            'source' => 'apple_health',
            'external_id' => 'health-record-123',
        ]);

        $this->getJson('/api/v1/fitness/body-metrics?metric_type=weight')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['source' => 'manual'])
            ->assertJsonFragment(['source' => 'apple_health']);

        Sanctum::actingAs($otherOwner);
        $this->getJson('/api/v1/fitness/body-metrics?metric_type=weight')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_owner_can_create_update_and_scope_fitness_goals(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($owner);

        $goalId = $this->postJson('/api/v1/fitness/goals', [
            'metric_type' => 'weight',
            'target_value' => 75,
            'unit' => 'kg',
            'target_date' => '2027-01-01',
            'notes' => 'Steady progress',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->json('data.id');

        $this->patchJson("/api/v1/fitness/goals/{$goalId}", [
            'target_value' => 74,
            'status' => 'paused',
        ])->assertOk()
            ->assertJsonPath('data.target_value', '74.0000')
            ->assertJsonPath('data.status', 'paused');

        Sanctum::actingAs($otherOwner);
        $this->getJson('/api/v1/fitness/goals')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->patchJson("/api/v1/fitness/goals/{$goalId}", ['status' => 'completed'])
            ->assertNotFound();

        $this->assertDatabaseHas('fitness_goals', [
            'id' => $goalId,
            'owner_id' => $owner->getAuthIdentifier(),
            'status' => 'paused',
        ]);
    }

    public function test_fitness_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/fitness/body-metrics')->assertUnauthorized();
        $this->postJson('/api/v1/fitness/body-metrics')->assertUnauthorized();
        $this->getJson('/api/v1/fitness/goals')->assertUnauthorized();
        $this->postJson('/api/v1/fitness/goals')->assertUnauthorized();
    }
}
