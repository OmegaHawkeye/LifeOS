<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceAssetsApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_assets_keep_manual_valuation_history_and_can_be_archived(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $assetId = $this->postJson('/api/v1/finance/assets', [
            'name' => 'CS2 inventory',
            'asset_type' => 'game_item',
            'currency' => 'EUR',
            'cost_basis' => '80.0000',
            'initial_value' => '125.0000',
            'valued_at' => '2026-09-01',
        ])->assertCreated()
            ->assertJsonPath('data.source', 'manual')
            ->json('data.id');

        $this->postJson("/api/v1/finance/assets/{$assetId}/valuations", [
            'value' => '140.0000',
            'valued_at' => '2026-09-20',
            'notes' => 'Manual market estimate',
        ])->assertCreated()
            ->assertJsonPath('data.source', 'manual');

        $this->getJson("/api/v1/finance/assets/{$assetId}/valuations")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.value', '140.0000')
            ->assertJsonPath('data.0.source', 'manual');

        $this->patchJson("/api/v1/finance/assets/{$assetId}", [
            'is_archived' => true,
        ])->assertOk()->assertJsonPath('data.is_archived', true);

        $this->patchJson("/api/v1/finance/assets/{$assetId}", [
            'is_archived' => false,
        ])->assertOk()->assertJsonPath('data.is_archived', false);
    }

    public function test_net_worth_includes_selected_accounts_and_assets_without_double_counting(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $custodyAccount = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Brokerage',
            'type' => 'investment',
            'currency' => 'EUR',
            'opening_balance' => '1000.0000',
        ])->assertCreated()->json('data.id');
        $cashAccount = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Savings',
            'type' => 'savings',
            'currency' => 'EUR',
            'opening_balance' => '500.0000',
        ])->assertCreated()->json('data.id');
        $assetId = $this->postJson('/api/v1/finance/assets', [
            'name' => 'Index fund holdings',
            'asset_type' => 'investment',
            'account_id' => $custodyAccount,
            'currency' => 'EUR',
            'initial_value' => '700.0000',
            'valued_at' => '2026-09-20',
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/finance/assets/{$assetId}/valuations", [
            'value' => '700.0000',
            'valued_at' => '2026-09-20',
        ])->assertCreated();

        $this->getJson('/api/v1/finance/net-worth')
            ->assertOk()
            ->assertJsonPath('data.totals.0.currency', 'EUR')
            ->assertJsonPath('data.totals.0.amount', '1200.0000')
            ->assertJsonPath('data.accounts.0.included', false)
            ->assertJsonPath('data.accounts.1.id', $cashAccount)
            ->assertJsonPath('data.assets.0.current_value', '700.0000');

        $this->patchJson("/api/v1/finance/accounts/{$cashAccount}", [
            'include_in_net_worth' => false,
        ])->assertOk();
        $this->getJson('/api/v1/finance/net-worth')
            ->assertOk()
            ->assertJsonPath('data.totals.0.amount', '700.0000');
    }

    public function test_asset_endpoints_are_owner_scoped(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($owner);
        $assetId = $this->postJson('/api/v1/finance/assets', [
            'name' => 'Private collectible',
            'asset_type' => 'collectible',
            'currency' => 'EUR',
            'initial_value' => '40.0000',
            'valued_at' => '2026-09-20',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($otherOwner);
        $this->getJson('/api/v1/finance/assets')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/finance/assets/{$assetId}/valuations", [
            'value' => '999.0000',
            'valued_at' => '2026-09-20',
        ])->assertNotFound();
    }

    public function test_assets_cannot_be_linked_to_accounts_in_a_different_currency(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Euro account',
            'type' => 'savings',
            'currency' => 'EUR',
            'opening_balance' => '1000.0000',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/v1/finance/assets', [
            'name' => 'Dollar asset',
            'asset_type' => 'investment',
            'account_id' => $accountId,
            'currency' => 'USD',
            'initial_value' => '700.0000',
            'valued_at' => '2026-09-20',
        ])->assertUnprocessable()->assertJsonValidationErrors('account_id');
    }

    public function test_legacy_mismatched_asset_currency_does_not_hide_account_balance(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Euro account',
            'type' => 'savings',
            'currency' => 'EUR',
            'opening_balance' => '1000.0000',
        ])->assertCreated()->json('data.id');
        $assetId = $this->postJson('/api/v1/finance/assets', [
            'name' => 'Linked asset',
            'asset_type' => 'investment',
            'account_id' => $accountId,
            'currency' => 'EUR',
            'initial_value' => '700.0000',
            'valued_at' => '2026-09-20',
        ])->assertCreated()->json('data.id');

        DB::table('finance_assets')->where('id', $assetId)->update(['currency' => 'USD']);

        $this->getJson('/api/v1/finance/net-worth')
            ->assertOk()
            ->assertJsonFragment(['currency' => 'EUR', 'amount' => '1000.0000'])
            ->assertJsonFragment(['currency' => 'USD', 'amount' => '700.0000']);
    }
}
