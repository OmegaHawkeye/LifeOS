<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Health\Models\HealthSample;
use App\Modules\Health\Models\HealthSource;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HealthTrendsApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_owner_gets_range_filtered_daily_trends_and_source_context(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 12:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $manual = $this->source($owner, 'manual', 'Manual entries', 'manual');
        $apple = $this->source($owner, 'apple', 'Apple Health', 'file');
        $other = $this->source($otherOwner, 'other', 'Other owner', 'manual');

        $this->sample($owner, $manual, 'steps', 4000, 'count', '2026-09-14 08:00:00', true);
        $this->sample($owner, $apple, 'steps', 6000, 'count', '2026-09-20 08:00:00');
        $this->sample($owner, $apple, 'sleep', 7.5, 'hour', '2026-09-19 07:00:00');
        $this->sample($owner, $manual, 'sleep', 30, 'min', '2026-09-19 07:30:00', true);
        $this->sample($owner, $manual, 'workouts', 45, 'min', '2026-09-18 18:00:00', true);
        $this->sample($owner, $apple, 'workouts', 0.5, 'hour', '2026-09-19 18:00:00');
        $this->sample($owner, $apple, 'calories', 520, 'kcal', '2026-09-20 10:00:00');
        $this->sample($owner, $manual, 'weight', 82, 'kg', '2026-09-14 08:00:00', true);
        $this->sample($owner, $apple, 'weight', 80, 'kg', '2026-09-19 08:00:00');
        $this->sample($owner, $apple, 'steps', 9000, 'count', '2026-09-01 08:00:00');
        $this->sample($otherOwner, $other, 'steps', 50000, 'count', '2026-09-20 08:00:00');
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/health/trends?range=7d')
            ->assertOk()
            ->assertJsonPath('data.range', '7d')
            ->assertJsonPath('data.from', '2026-09-14')
            ->assertJsonPath('data.to', '2026-09-20')
            ->assertJsonPath('data.trends.0.sample_type', 'calories')
            ->assertJsonPath('data.trends.0.total', '520.0000')
            ->assertJsonPath('data.trends.1.sample_type', 'sleep')
            ->assertJsonPath('data.trends.1.total', '8.0000')
            ->assertJsonPath('data.trends.2.sample_type', 'steps')
            ->assertJsonPath('data.trends.2.total', '10000.0000')
            ->assertJsonPath('data.trends.2.points.0.value', '4000.0000')
            ->assertJsonPath('data.trends.2.points.1.value', '6000.0000')
            ->assertJsonPath('data.trends.2.source_counts.manual', 1)
            ->assertJsonPath('data.trends.2.source_counts.imported', 1)
            ->assertJsonPath('data.trends.2.source_counts.sources.0.name', 'Apple Health')
            ->assertJsonPath('data.trends.3.sample_type', 'weight')
            ->assertJsonPath('data.trends.3.direction', 'down')
            ->assertJsonPath('data.trends.3.latest_value', '80.0000')
            ->assertJsonPath('data.trends.4.sample_type', 'workouts')
            ->assertJsonPath('data.trends.4.total', '75.0000')
            ->assertJsonMissing(['value' => '50000.0000'])
            ->assertJsonMissing(['value' => '9000.0000']);
    }

    public function test_health_trend_ranges_are_validated_and_authentication_is_required(): void
    {
        $this->getJson('/api/v1/health/trends')->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/health/trends?range=all-time')->assertUnprocessable();
    }

    public function test_year_to_date_range_starts_on_january_first(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 12:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        $source = $this->source($owner, 'manual', 'Manual', 'manual');
        $this->sample($owner, $source, 'weight', 81, 'kg', '2025-12-31 08:00:00');
        $this->sample($owner, $source, 'weight', 80, 'kg', '2026-01-01 08:00:00');
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/health/trends?range=ytd')
            ->assertOk()
            ->assertJsonPath('data.from', '2026-01-01')
            ->assertJsonPath('data.trends.0.total', '80.0000');
    }

    public function test_sleep_trend_uses_sleep_stage_duration_and_excludes_in_bed_time(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 12:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        $source = $this->source($owner, 'apple', 'Apple Health', 'file');
        $this->sample($owner, $source, 'sleep', 1, 'stage', '2026-09-19 22:00:00', false, '2026-09-19 23:00:00', [
            'sleep_stage' => 'HKCategoryValueSleepAnalysisAsleep',
        ]);
        $this->sample($owner, $source, 'sleep', 1, 'stage', '2026-09-19 21:00:00', false, '2026-09-19 22:00:00', [
            'sleep_stage' => 'HKCategoryValueSleepAnalysisInBed',
        ]);
        $this->sample($owner, $source, 'sleep', 1, 'stage', '2026-09-19 23:00:00', false, '2026-09-20 00:00:00', [
            'sleep_stage' => 'HKCategoryValueSleepAnalysisAwake',
        ]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/health/trends?range=7d')
            ->assertOk()
            ->assertJsonPath('data.trends.0.total', '1.0000')
            ->assertJsonPath('data.trends.0.unit', 'hour');
    }

    private function source(User $owner, string $key, string $name, string $kind): HealthSource
    {
        $source = new HealthSource(['key' => $key, 'name' => $name, 'kind' => $kind]);
        $source->owner_id = $owner->getAuthIdentifier();
        $source->save();

        return $source;
    }

    private function sample(
        User $owner,
        HealthSource $source,
        string $type,
        int|float $value,
        string $unit,
        string $recordedAt,
        bool $manual = false,
        ?string $endedAt = null,
        array $metadata = [],
    ): void {
        $sample = new HealthSample([
            'source_id' => $source->getKey(),
            'sample_type' => $type,
            'value' => $value,
            'unit' => $unit,
            'recorded_at' => $recordedAt,
            'ended_at' => $endedAt,
            'metadata' => $metadata,
            'is_manual' => $manual,
        ]);
        $sample->owner_id = $owner->getAuthIdentifier();
        $sample->save();
    }
}
