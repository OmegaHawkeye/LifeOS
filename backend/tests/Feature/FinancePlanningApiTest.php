<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinancePlanningApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_planning_endpoints_require_an_authenticated_owner(): void
    {
        $this->getJson('/api/v1/finance/budgets')->assertUnauthorized();
        $this->postJson('/api/v1/finance/budgets')->assertUnauthorized();
        $this->getJson('/api/v1/finance/subscriptions')->assertUnauthorized();
        $this->postJson('/api/v1/finance/subscriptions')->assertUnauthorized();
        $this->getJson('/api/v1/finance/savings-goals')->assertUnauthorized();
        $this->postJson('/api/v1/finance/savings-goals')->assertUnauthorized();
    }

    public function test_budget_reports_currency_matched_monthly_spending_and_over_budget_state(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
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
            'amount' => '65.00',
            'occurred_at' => '2026-09-10T12:00:00+02:00',
        ])->assertCreated();

        $this->postJson('/api/v1/finance/budgets', [
            'category_id' => $categoryId,
            'month' => '2026-09',
            'currency' => 'EUR',
            'target_amount' => '50.00',
        ])->assertCreated()
            ->assertJsonPath('data.category_name', 'Groceries')
            ->assertJsonPath('data.spent', '65.0000')
            ->assertJsonPath('data.remaining', '-15.0000')
            ->assertJsonPath('data.is_over_budget', true);

        $this->getJson('/api/v1/finance/budgets?month=2026-09')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.target_amount', '50.0000');
        $this->assertDatabaseHas('finance_budgets', [
            'owner_id' => $owner->id,
            'category_id' => $categoryId,
            'month' => '2026-09-01',
            'currency' => 'EUR',
            'target_amount' => '50.0000',
        ]);
    }

    public function test_owner_can_update_a_budget_and_duplicate_monthly_category_budgets_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $categoryId = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Dining out',
            'type' => 'expense',
        ])->assertCreated()->json('data.id');
        $budgetId = $this->postJson('/api/v1/finance/budgets', [
            'category_id' => $categoryId,
            'month' => '2026-09',
            'currency' => 'EUR',
            'target_amount' => '120.00',
        ])->assertCreated()->json('data.id');

        $this->patchJson("/api/v1/finance/budgets/{$budgetId}", [
            'target_amount' => '150.00',
        ])->assertOk()
            ->assertJsonPath('data.id', $budgetId)
            ->assertJsonPath('data.target_amount', '150.0000');

        $this->postJson('/api/v1/finance/budgets', [
            'category_id' => $categoryId,
            'month' => '2026-09',
            'currency' => 'EUR',
            'target_amount' => '200.00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);

        $this->deleteJson("/api/v1/finance/budgets/{$budgetId}")->assertNoContent();
        $this->assertDatabaseMissing('finance_budgets', ['id' => $budgetId]);
    }

    public function test_subscription_can_be_paused_resumed_and_canceled_without_losing_its_details(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Card account',
            'type' => 'checking',
            'currency' => 'EUR',
        ])->assertCreated()->json('data.id');
        $subscriptionId = $this->postJson('/api/v1/finance/subscriptions', [
            'account_id' => $accountId,
            'name' => 'Streaming service',
            'amount' => '12.99',
            'billing_cycle' => 'monthly',
            'next_renewal_on' => '2026-09-25',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.amount', '12.9900')
            ->assertJsonPath('data.currency', 'EUR')
            ->json('data.id');

        $this->patchJson("/api/v1/finance/subscriptions/{$subscriptionId}", [
            'status' => 'paused',
        ])->assertOk()->assertJsonPath('data.status', 'paused');
        $this->assertDatabaseHas('finance_recurring_patterns', [
            'id' => $subscriptionId,
            'is_active' => false,
            'status' => 'paused',
        ]);

        $this->patchJson("/api/v1/finance/subscriptions/{$subscriptionId}", [
            'status' => 'active',
        ])->assertOk()->assertJsonPath('data.status', 'active');
        $this->patchJson("/api/v1/finance/subscriptions/{$subscriptionId}", [
            'status' => 'canceled',
        ])->assertOk()->assertJsonPath('data.status', 'canceled');

        $this->getJson('/api/v1/finance/subscriptions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Streaming service')
            ->assertJsonPath('data.0.status', 'canceled');
    }

    public function test_savings_goal_reports_progress_and_required_monthly_pace(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->travelTo(Carbon::parse('2026-09-15T10:00:00+02:00'));

        $created = $this->postJson('/api/v1/finance/savings-goals', [
            'name' => 'Emergency fund',
            'target_amount' => '1200.00',
            'current_amount' => '300.00',
            'currency' => 'EUR',
            'target_date' => '2026-12-15',
        ])->assertCreated()
            ->assertJsonPath('data.progress_percent', 25)
            ->assertJsonPath('data.remaining_amount', '900.0000')
            ->assertJsonPath('data.required_monthly_pace', '300.0000');
        $goalId = $created->json('data.id');

        $this->patchJson("/api/v1/finance/savings-goals/{$goalId}", [
            'current_amount' => '600.00',
        ])->assertOk()
            ->assertJsonPath('data.progress_percent', 50)
            ->assertJsonPath('data.required_monthly_pace', '200.0000');
        $this->assertDatabaseHas('finance_savings_goals', [
            'id' => $goalId,
            'current_amount' => '600.0000',
        ]);

        $this->deleteJson("/api/v1/finance/savings-goals/{$goalId}")->assertNoContent();
        $this->assertDatabaseMissing('finance_savings_goals', ['id' => $goalId]);
        $this->travelBack();
    }

    public function test_budget_and_goal_records_are_not_accessible_to_another_owner(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $categoryId = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Travel',
            'type' => 'expense',
        ])->assertCreated()->json('data.id');
        $budgetId = $this->postJson('/api/v1/finance/budgets', [
            'category_id' => $categoryId,
            'month' => '2026-09',
            'currency' => 'EUR',
            'target_amount' => '200.00',
        ])->assertCreated()->json('data.id');
        $goalId = $this->postJson('/api/v1/finance/savings-goals', [
            'name' => 'Trip',
            'target_amount' => '1000.00',
            'current_amount' => '0.00',
            'currency' => 'EUR',
            'target_date' => '2027-09-01',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs(User::factory()->create());

        $this->patchJson("/api/v1/finance/budgets/{$budgetId}", [
            'target_amount' => '250.00',
        ])->assertNotFound();
        $this->deleteJson("/api/v1/finance/savings-goals/{$goalId}")->assertNotFound();
    }
}
