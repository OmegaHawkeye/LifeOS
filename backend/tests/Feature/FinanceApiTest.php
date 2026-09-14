<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_finance_endpoints_require_an_authenticated_owner(): void
    {
        $this->getJson('/api/v1/finance/accounts')->assertUnauthorized();
        $this->getJson('/api/v1/finance/categories')->assertUnauthorized();
        $this->getJson('/api/v1/finance/transactions')->assertUnauthorized();
        $this->getJson('/api/v1/finance/transfers')->assertUnauthorized();
    }

    public function test_owner_can_create_and_list_a_persisted_financial_account(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Primary Checking',
            'type' => 'checking',
            'currency' => 'EUR',
            'opening_balance' => '1250.00',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Primary Checking')
            ->assertJsonPath('data.type', 'checking')
            ->assertJsonPath('data.currency', 'EUR')
            ->assertJsonPath('data.opening_balance', '1250.0000')
            ->assertJsonPath('data.balance', '1250.0000');

        $this->getJson('/api/v1/finance/accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Primary Checking');
    }

    public function test_account_currency_defaults_to_the_owner_preference_and_accounts_are_isolated(): void
    {
        $owner = User::factory()->create();
        $owner->settings()->create(['currency' => 'CHF']);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Everyday Account',
            'type' => 'checking',
        ])->assertCreated()
            ->assertJsonPath('data.currency', 'CHF')
            ->assertJsonPath('data.opening_balance', '0.0000');

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/finance/accounts')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_owner_can_edit_a_transaction_category_without_changing_its_identity(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $created = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Groceries',
            'type' => 'expense',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Groceries')
            ->assertJsonPath('data.type', 'expense');

        $categoryId = $created->json('data.id');

        $this->patchJson("/api/v1/finance/categories/{$categoryId}", [
            'name' => 'Food & groceries',
        ])->assertOk()
            ->assertJsonPath('data.id', $categoryId)
            ->assertJsonPath('data.name', 'Food & groceries');

        $this->getJson('/api/v1/finance/categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $categoryId)
            ->assertJsonPath('data.0.name', 'Food & groceries');
    }

    public function test_category_renaming_preserves_existing_transaction_history(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Daily account',
            'type' => 'checking',
            'currency' => 'EUR',
        ])->assertCreated()->json('data.id');
        $categoryId = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Groceries',
            'type' => 'expense',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/v1/finance/transactions', [
            'account_id' => $accountId,
            'category_id' => $categoryId,
            'type' => 'expense',
            'amount' => '42.50',
            'description' => 'Weekly shop',
            'occurred_at' => '2026-09-14T12:30:00+02:00',
            'payee' => 'Hofer',
            'tags' => ['weekly', 'food'],
        ])->assertCreated()
            ->assertJsonPath('data.account_id', $accountId)
            ->assertJsonPath('data.currency', 'EUR')
            ->assertJsonPath('data.payee', 'Hofer')
            ->assertJsonPath('data.tags.0', 'weekly')
            ->assertJsonPath('data.tags.1', 'food');

        $this->patchJson("/api/v1/finance/categories/{$categoryId}", [
            'name' => 'Food & groceries',
        ])->assertOk();

        $this->getJson('/api/v1/finance/transactions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category.id', $categoryId)
            ->assertJsonPath('data.0.category.name', 'Food & groceries')
            ->assertJsonPath('data.0.description', 'Weekly shop')
            ->assertJsonPath('data.0.payee', 'Hofer')
            ->assertJsonPath('data.0.tags.0', 'weekly');

        $this->getJson('/api/v1/finance/accounts')
            ->assertOk()
            ->assertJsonPath('data.0.balance', '-42.5000');
    }

    public function test_a_currency_conversion_transfer_is_paired_and_separate_from_cashflow_transactions(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $sourceAccountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Euro account',
            'type' => 'checking',
            'currency' => 'EUR',
            'opening_balance' => '1000.00',
        ])->assertCreated()->json('data.id');
        $destinationAccountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Swiss account',
            'type' => 'savings',
            'currency' => 'CHF',
            'opening_balance' => '100.00',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/v1/finance/transfers', [
            'from_account_id' => $sourceAccountId,
            'to_account_id' => $destinationAccountId,
            'from_amount' => '100.00',
            'to_amount' => '95.00',
            'occurred_at' => '2026-09-14T13:00:00+02:00',
            'description' => 'Monthly savings',
        ])->assertCreated()
            ->assertJsonPath('data.from_account_id', $sourceAccountId)
            ->assertJsonPath('data.to_account_id', $destinationAccountId)
            ->assertJsonPath('data.from_amount', '100.0000')
            ->assertJsonPath('data.to_amount', '95.0000')
            ->assertJsonPath('data.from_currency', 'EUR')
            ->assertJsonPath('data.to_currency', 'CHF');

        $accounts = $this->getJson('/api/v1/finance/accounts')->assertOk();
        $accounts->assertJsonPath('data.0.balance', '900.0000')
            ->assertJsonPath('data.1.balance', '195.0000');

        $this->getJson('/api/v1/finance/transactions')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_transactions_cannot_reference_another_owners_account_or_category(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Private account',
            'type' => 'checking',
        ])->assertCreated()->json('data.id');
        $categoryId = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Private category',
            'type' => 'expense',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/finance/transactions', [
            'account_id' => $accountId,
            'category_id' => $categoryId,
            'type' => 'expense',
            'amount' => '1.00',
            'occurred_at' => '2026-09-14T14:00:00+02:00',
        ])->assertNotFound();

        $this->assertDatabaseCount('finance_transactions', 0);
    }

    public function test_a_transaction_category_must_match_its_income_or_expense_type(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Daily account',
            'type' => 'checking',
        ])->assertCreated()->json('data.id');
        $categoryId = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Salary',
            'type' => 'income',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/v1/finance/transactions', [
            'account_id' => $accountId,
            'category_id' => $categoryId,
            'type' => 'expense',
            'amount' => '1.00',
            'occurred_at' => '2026-09-14T14:00:00+02:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('category_id');

        $this->assertDatabaseCount('finance_transactions', 0);
    }

    public function test_cross_currency_transfers_require_a_destination_amount_and_owned_accounts(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $sourceAccountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Euro account',
            'type' => 'checking',
            'currency' => 'EUR',
        ])->assertCreated()->json('data.id');
        $destinationAccountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Franc account',
            'type' => 'savings',
            'currency' => 'CHF',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/v1/finance/transfers', [
            'from_account_id' => $sourceAccountId,
            'to_account_id' => $destinationAccountId,
            'from_amount' => '50.00',
            'occurred_at' => '2026-09-14T14:00:00+02:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('to_amount');

        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/finance/transfers', [
            'from_account_id' => $sourceAccountId,
            'to_account_id' => $destinationAccountId,
            'from_amount' => '50.00',
            'to_amount' => '45.00',
            'occurred_at' => '2026-09-14T14:00:00+02:00',
        ])->assertNotFound();

        $this->assertDatabaseCount('finance_transfers', 0);
    }
}
