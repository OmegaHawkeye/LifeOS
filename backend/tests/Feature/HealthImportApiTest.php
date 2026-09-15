<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HealthImportApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_owner_can_import_supported_health_xml_and_receive_summary(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $xml = <<<'XML'
        <?xml version="1.0" encoding="UTF-8"?>
        <HealthData locale="en_US">
          <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-09-15 09:00:00 +0200" endDate="2026-09-15 10:00:00 +0200" value="1200" unit="count" sourceName="iPhone" />
          <Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-09-15 08:00:00 +0200" endDate="2026-09-15 08:00:00 +0200" value="80" unit="kg" sourceName="Scale" />
          <Record type="HKQuantityTypeIdentifierDistanceWalkingRunning" startDate="2026-09-15 11:00:00 +0200" endDate="2026-09-15 12:00:00 +0200" value="2" unit="km" sourceName="iPhone" />
          <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-09-14 23:00:00 +0200" endDate="2026-09-15 07:00:00 +0200" value="HKCategoryValueSleepAnalysisAsleep" sourceName="iPhone" />
          <Workout workoutActivityType="HKWorkoutActivityTypeRunning" startDate="2026-09-15 06:00:00 +0200" endDate="2026-09-15 06:30:00 +0200" duration="30" durationUnit="min" sourceName="Apple Watch" />
        </HealthData>
        XML;

        $this->post('/api/v1/health/imports', [
            'file' => UploadedFile::fake()->createWithContent('export.xml', $xml),
        ])->assertCreated()
            ->assertJsonPath('data.status', 'partial_success')
            ->assertJsonPath('data.imported_count', 4)
            ->assertJsonPath('data.skipped_count', 1)
            ->assertJsonPath('data.failed_count', 0);

        $this->assertDatabaseCount('health_samples', 4);
        $this->assertDatabaseHas('health_samples', ['sample_type' => 'steps', 'unit' => 'count']);
        $this->assertDatabaseHas('health_samples', ['sample_type' => 'weight', 'unit' => 'kg']);
        $this->assertDatabaseHas('health_samples', ['sample_type' => 'sleep', 'unit' => 'stage']);
        $this->assertDatabaseHas('health_samples', ['sample_type' => 'workouts', 'unit' => 'min']);
    }

    public function test_reimporting_the_same_xml_is_idempotent_and_invalid_xml_fails_safely(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $xml = '<HealthData><Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-09-15 09:00:00 +0200" endDate="2026-09-15 10:00:00 +0200" value="1200" unit="count" /></HealthData>';
        $file = fn (): UploadedFile => UploadedFile::fake()->createWithContent('export.xml', $xml);
        $this->post('/api/v1/health/imports', ['file' => $file()])->assertCreated()->assertJsonPath('data.imported_count', 1);
        $this->post('/api/v1/health/imports', ['file' => $file()])->assertCreated()->assertJsonPath('data.imported_count', 0)->assertJsonPath('data.skipped_count', 1);
        $this->post('/api/v1/health/imports', ['file' => UploadedFile::fake()->createWithContent('broken.xml', '<not-health>')])
            ->assertUnprocessable()->assertJsonValidationErrors(['file']);
    }
}
