<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Finance\Models\FinanceAccount;
use App\Modules\Fitness\Models\FitnessProgressPhoto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountDeletionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_deletion_requires_authentication(): void
    {
        $this->deleteJson('/api/v1/account')->assertUnauthorized();
    }

    public function test_account_deletion_requires_the_current_password_and_exact_email_confirmation(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ]);

        $this->actingAs($owner)->deleteJson('/api/v1/account', [
            'current_password' => 'wrong password',
            'email_confirmation' => $owner->email,
        ])->assertUnprocessable();

        $this->actingAs($owner)->deleteJson('/api/v1/account', [
            'current_password' => 'correct horse battery staple',
            'email_confirmation' => 'other@example.test',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('users', ['id' => $owner->id]);
    }

    public function test_owner_can_delete_their_account_data_sessions_tokens_and_private_files(): void
    {
        Storage::fake('fitness-private');
        $owner = User::factory()->create([
            'email' => 'owner@example.test',
            'password' => 'correct horse battery staple',
        ]);
        $otherOwner = User::factory()->create();
        $account = $this->createAccount($owner);
        $this->createAccount($otherOwner);
        $photoPath = "owners/{$owner->id}/progress-photos/private.jpg";
        $otherPhotoPath = "owners/{$otherOwner->id}/progress-photos/private.jpg";
        Storage::disk('fitness-private')->put($photoPath, 'private photo');
        Storage::disk('fitness-private')->put($otherPhotoPath, 'other photo');
        FitnessProgressPhoto::factory()->create([
            'owner_id' => $owner->id,
            'storage_path' => $photoPath,
        ]);
        FitnessProgressPhoto::factory()->create([
            'owner_id' => $otherOwner->id,
            'storage_path' => $otherPhotoPath,
        ]);
        $owner->createToken('owner device');
        DB::table('sessions')->insert([
            'id' => 'owner-session',
            'user_id' => $owner->id,
            'payload' => 'private session payload',
            'last_activity' => now()->timestamp,
        ]);
        DB::table('password_reset_tokens')->insert([
            'email' => $owner->email,
            'token' => 'private-reset-token',
            'created_at' => now(),
        ]);

        $this->actingAs($owner)->deleteJson('/api/v1/account', [
            'current_password' => 'correct horse battery staple',
            'email_confirmation' => $owner->email,
        ])->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $owner->id]);
        $this->assertDatabaseHas('users', ['id' => $otherOwner->id]);
        $this->assertDatabaseMissing('finance_accounts', ['id' => $account->id]);
        $this->assertDatabaseHas('finance_accounts', ['owner_id' => $otherOwner->id]);
        $this->assertDatabaseMissing('fitness_progress_photos', ['owner_id' => $owner->id]);
        $this->assertDatabaseHas('fitness_progress_photos', ['owner_id' => $otherOwner->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $owner->id]);
        $this->assertDatabaseMissing('sessions', ['id' => 'owner-session']);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $owner->email]);
        $this->assertFalse(Storage::disk('fitness-private')->exists($photoPath));
        $this->assertTrue(Storage::disk('fitness-private')->exists($otherPhotoPath));
    }

    private function createAccount(User $owner): FinanceAccount
    {
        $account = new FinanceAccount([
            'name' => 'Checking account',
            'type' => 'checking',
            'currency' => 'EUR',
            'opening_balance' => '100.0000',
            'include_in_net_worth' => true,
        ]);
        $account->owner_id = $owner->id;
        $account->save();

        return $account;
    }
}
