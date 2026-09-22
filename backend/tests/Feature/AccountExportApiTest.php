<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use App\Modules\Fitness\Models\FitnessProgressPhoto;
use App\Modules\Health\Models\HealthSample;
use App\Modules\Health\Models\HealthSource;
use App\Modules\Nutrition\Models\NutritionRecipe;
use App\Modules\Nutrition\Models\NutritionTarget;
use App\Modules\Review\Models\WeeklyReview;
use App\Modules\Routines\Models\Routine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class AccountExportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_export_requires_authentication(): void
    {
        $this->getJson('/api/v1/account/export')->assertUnauthorized();
    }

    public function test_owner_can_download_a_private_archive_with_only_their_data_and_original_photos(): void
    {
        Storage::fake('fitness-private');
        $owner = User::factory()->create(['name' => 'Export owner']);
        $owner->forceFill([
            'password' => 'private-password-marker',
            'two_factor_secret' => 'private-totp-marker',
        ])->save();
        $owner->settings()->create([
            'timezone' => 'Europe/Vienna',
            'currency' => 'EUR',
            'measurement_system' => 'metric',
            'theme' => 'system',
            'mask_sensitive_data_by_default' => true,
            'notifications_enabled' => false,
        ]);
        $this->createAccount($owner, 'Owner account marker');

        $otherOwner = User::factory()->create();
        $this->createAccount($otherOwner, 'Other owner account marker');
        $otherOwner->settings()->create([
            'timezone' => 'UTC',
            'currency' => 'USD',
            'measurement_system' => 'imperial',
            'theme' => 'dark',
            'mask_sensitive_data_by_default' => false,
            'notifications_enabled' => false,
        ]);

        $this->createDomainRecords($owner, 'Owner');
        $this->createDomainRecords($otherOwner, 'Other owner');
        FitnessProgressPhoto::factory()->create([
            'owner_id' => $otherOwner->id,
            'storage_path' => "owners/{$otherOwner->id}/progress-photos/foreign.jpg",
            'notes' => 'Other owner photo marker',
        ]);

        $photoPath = "owners/{$owner->id}/progress-photos/original.jpg";
        $photoBytes = "original-private-photo-bytes\0\xFF";
        Storage::disk('fitness-private')->put($photoPath, $photoBytes);
        FitnessProgressPhoto::factory()->create([
            'owner_id' => $owner->id,
            'storage_path' => $photoPath,
            'mime_type' => 'image/jpeg',
            'file_size' => strlen($photoBytes),
        ]);

        $response = $this->actingAs($owner)->get('/api/v1/account/export');

        $response->assertOk()
            ->assertHeader('content-type', 'application/zip')
            ->assertHeader('cache-control', 'no-store, private');

        $temporaryPath = tempnam(sys_get_temp_dir(), 'lifeos-export-test-');
        $this->assertNotFalse($temporaryPath);
        file_put_contents($temporaryPath, $response->streamedContent());

        $archive = new ZipArchive;
        $this->assertTrue($archive->open($temporaryPath));

        try {
            $manifest = json_decode((string) $archive->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
            $dataJson = (string) $archive->getFromName('data.json');
            $data = json_decode($dataJson, true, flags: JSON_THROW_ON_ERROR);
            $photo = FitnessProgressPhoto::query()->where('owner_id', $owner->id)->firstOrFail();

            $this->assertSame(1, $manifest['schema_version']);
            $this->assertSame('Export owner', $data['owner']['name']);
            $this->assertSame('EUR', $data['settings']['currency']);
            $this->assertSame('Owner account marker', $data['finance']['accounts'][0]['name']);
            $this->assertSame('Owner fitness marker', $data['fitness']['body_metrics'][0]['notes']);
            $this->assertSame('Owner health marker', $data['health']['sources'][0]['name']);
            $this->assertSame('Owner nutrition marker', $data['nutrition']['recipes'][0]['name']);
            $this->assertSame('Owner routine marker', $data['routines']['routines'][0]['title']);
            $this->assertSame('Owner review marker', $data['weekly_reviews'][0]['next_week_focus']);
            $this->assertArrayNotHasKey('access_token', $data['health']['sources'][0]['metadata']);
            $this->assertArrayNotHasKey('storage_path', $data['fitness']['progress_photos'][0]);
            $this->assertStringNotContainsString('Other owner account marker', $dataJson);
            $this->assertStringNotContainsString('Other owner fitness marker', $dataJson);
            $this->assertStringNotContainsString('Other owner health marker', $dataJson);
            $this->assertStringNotContainsString('Other owner nutrition marker', $dataJson);
            $this->assertStringNotContainsString('Other owner routine marker', $dataJson);
            $this->assertStringNotContainsString('Other owner review marker', $dataJson);
            $this->assertStringNotContainsString('Other owner photo marker', $dataJson);
            $this->assertStringNotContainsString('private-password-marker', $dataJson);
            $this->assertStringNotContainsString('private-totp-marker', $dataJson);
            $this->assertStringNotContainsString('private-health-token-marker', $dataJson);
            $this->assertStringNotContainsString('password', json_encode($data['owner'], JSON_THROW_ON_ERROR));
            $this->assertSame(
                $photoBytes,
                $archive->getFromName("files/progress-photos/{$photo->id}.jpg"),
            );
            $this->assertContains("files/progress-photos/{$photo->id}.jpg", $manifest['files']);
        } finally {
            $archive->close();
            unlink($temporaryPath);
        }
    }

    public function test_export_fails_instead_of_silently_omitting_a_missing_private_photo(): void
    {
        Storage::fake('fitness-private');
        $owner = User::factory()->create();
        $missingPhotoPath = "owners/{$owner->id}/progress-photos/missing.jpg";
        FitnessProgressPhoto::factory()->create([
            'owner_id' => $owner->id,
            'storage_path' => $missingPhotoPath,
        ]);

        $this->actingAs($owner)
            ->getJson('/api/v1/account/export')
            ->assertServerError()
            ->assertDontSee($missingPhotoPath);
    }

    private function createAccount(User $owner, string $name): void
    {
        $account = new FinanceAccount([
            'name' => $name,
            'type' => 'checking',
            'currency' => 'EUR',
            'opening_balance' => '0.0000',
            'include_in_net_worth' => true,
        ]);
        $account->owner_id = $owner->id;
        $account->save();
    }

    private function createDomainRecords(User $owner, string $label): void
    {
        $metric = new FitnessBodyMetric([
            'metric_type' => 'weight',
            'value' => '81.2500',
            'unit' => 'kg',
            'measured_at' => now(),
            'notes' => "{$label} fitness marker",
        ]);
        $metric->owner_id = $owner->id;
        $metric->save();

        $source = new HealthSource([
            'key' => strtolower(str_replace(' ', '-', $label)).'-health',
            'name' => "{$label} health marker",
            'kind' => 'manual',
            'metadata' => ['access_token' => 'private-health-token-marker'],
        ]);
        $source->owner_id = $owner->id;
        $source->save();

        $sample = new HealthSample([
            'source_id' => $source->id,
            'external_id' => strtolower(str_replace(' ', '-', $label)).'-sample',
            'sample_type' => 'steps',
            'value' => '42',
            'unit' => 'count',
            'recorded_at' => now(),
            'is_manual' => true,
        ]);
        $sample->owner_id = $owner->id;
        $sample->save();

        NutritionTarget::query()->create([
            'owner_id' => $owner->id,
            'calories' => 2100,
            'notes' => "{$label} nutrition target marker",
        ]);
        NutritionRecipe::query()->create([
            'owner_id' => $owner->id,
            'name' => "{$label} nutrition marker",
            'servings' => 1,
        ]);

        Routine::query()->create([
            'owner_id' => $owner->id,
            'title' => "{$label} routine marker",
            'domain' => 'personal',
            'frequency' => 'daily',
            'days_of_week' => [1],
            'is_active' => true,
        ]);
        WeeklyReview::query()->create([
            'owner_id' => $owner->id,
            'week_start' => now()->startOfWeek()->toDateString(),
            'next_week_focus' => "{$label} review marker",
        ]);
    }
}
