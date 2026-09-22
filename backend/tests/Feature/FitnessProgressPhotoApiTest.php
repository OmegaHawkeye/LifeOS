<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FitnessProgressPhotoApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('fitness-private');
    }

    public function test_owner_can_upload_review_and_delete_a_private_progress_photo(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $metric = FitnessBodyMetric::factory()->create(['owner_id' => $owner->getAuthIdentifier()]);
        Sanctum::actingAs($owner);

        $photoId = $this->post('/api/v1/fitness/progress-photos', [
            'photo' => UploadedFile::fake()->image('private-progress.jpg'),
            'photo_date' => '2026-09-20',
            'angle' => 'front',
            'tags' => ['monthly', 'relaxed'],
            'notes' => 'Morning check-in',
            'body_metric_id' => $metric->getKey(),
        ])->assertCreated()
            ->assertJsonPath('data.photo_date', '2026-09-20')
            ->assertJsonPath('data.angle', 'front')
            ->assertJsonPath('data.tags.0', 'monthly')
            ->assertJsonPath('data.body_metric.id', $metric->getKey())
            ->assertJsonMissingPath('data.storage_path')
            ->json('data.id');

        $path = "owners/{$owner->getAuthIdentifier()}/progress-photos/";
        $storedFiles = Storage::disk('fitness-private')->allFiles($path);
        $this->assertCount(1, $storedFiles);
        $photoPath = $storedFiles[0];
        $this->assertStringNotContainsString('private-progress', $photoPath);

        $this->get("/api/v1/fitness/progress-photos/{$photoId}/content")
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        Sanctum::actingAs($otherOwner);
        $this->getJson('/api/v1/fitness/progress-photos')->assertOk()->assertJsonCount(0, 'data');
        $this->get("/api/v1/fitness/progress-photos/{$photoId}/content")->assertNotFound();
        $this->deleteJson("/api/v1/fitness/progress-photos/{$photoId}")->assertNotFound();
        Storage::disk('fitness-private')->assertExists($photoPath);

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/v1/fitness/progress-photos/{$photoId}")->assertNoContent();
        Storage::disk('fitness-private')->assertMissing($photoPath);
        $this->assertDatabaseMissing('fitness_progress_photos', ['id' => $photoId]);
    }

    public function test_upload_rejects_non_images_and_body_metrics_from_another_owner(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $foreignMetric = FitnessBodyMetric::factory()->create(['owner_id' => $otherOwner->getAuthIdentifier()]);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/fitness/progress-photos', [
            'photo' => UploadedFile::fake()->create('private.pdf', 10, 'application/pdf'),
            'photo_date' => '2026-09-20',
            'body_metric_id' => $foreignMetric->getKey(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['photo', 'body_metric_id']);

        Storage::disk('fitness-private')->assertDirectoryEmpty('owners/'.$owner->getAuthIdentifier().'/progress-photos');
    }

    public function test_monthly_review_prompt_is_owner_scoped_and_can_be_completed(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $reviewUrl = '/api/v1/fitness/progress-photos/monthly-review?month=2026-09';
        $this->getJson($reviewUrl)
            ->assertOk()
            ->assertJsonPath('data.month', '2026-09')
            ->assertJsonPath('data.is_due', true);

        $this->putJson('/api/v1/fitness/progress-photos/monthly-review', [
            'month' => '2026-09',
            'notes' => 'Strength is improving steadily.',
        ])->assertOk()
            ->assertJsonPath('data.is_due', false)
            ->assertJsonPath('data.notes', 'Strength is improving steadily.');

        Sanctum::actingAs(User::factory()->create());
        $this->getJson($reviewUrl)->assertOk()->assertJsonPath('data.is_due', true);
    }

    public function test_progress_photo_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/fitness/progress-photos')->assertUnauthorized();
        $this->postJson('/api/v1/fitness/progress-photos')->assertUnauthorized();
        $this->getJson('/api/v1/fitness/progress-photos/monthly-review')->assertUnauthorized();
        $this->getJson('/api/v1/fitness/progress-photos/1/content')->assertUnauthorized();
        $this->deleteJson('/api/v1/fitness/progress-photos/1')->assertUnauthorized();
    }
}
