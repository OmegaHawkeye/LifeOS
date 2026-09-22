<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoutinesAndWeeklyReviewApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_routines_schedule_complete_snooze_and_gate_reminders_by_owner_preference(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 10:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $routineId = $this->postJson('/api/v1/routines', [
            'title' => 'Sunday meal prep',
            'domain' => 'nutrition',
            'frequency' => 'weekly',
            'days_of_week' => [7],
            'reminder_time' => '09:00',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Sunday meal prep')
            ->json('data.id');

        $this->getJson('/api/v1/routines')
            ->assertOk()
            ->assertJsonPath('data.notifications_enabled', false)
            ->assertJsonPath('data.routines.0.is_scheduled_today', true)
            ->assertJsonPath('data.routines.0.status', 'due')
            ->assertJsonPath('data.routines.0.reminder_active', false);

        $this->postJson("/api/v1/routines/{$routineId}/snooze", ['minutes' => 60])
            ->assertOk()
            ->assertJsonPath('data.status', 'snoozed')
            ->assertJsonPath('data.snoozed_until', '2026-09-20T11:00:00+02:00');

        $this->patchJson('/api/v1/settings', ['notifications_enabled' => true])->assertOk();
        $this->getJson('/api/v1/routines')
            ->assertOk()
            ->assertJsonPath('data.notifications_enabled', true)
            ->assertJsonPath('data.routines.0.reminder_active', false);

        $this->postJson("/api/v1/routines/{$routineId}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
        $this->getJson('/api/v1/routines')
            ->assertOk()
            ->assertJsonPath('data.routines.0.status', 'completed')
            ->assertJsonCount(1, 'data.recent_completions');
    }

    public function test_unscheduled_and_other_owner_routines_do_not_create_backlog(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 10:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($owner);
        $routineId = $this->postJson('/api/v1/routines', [
            'title' => 'Monday finance check',
            'domain' => 'finance',
            'frequency' => 'weekly',
            'days_of_week' => [1],
        ])->assertCreated()->json('data.id');
        Sanctum::actingAs($otherOwner);
        $otherRoutineId = $this->postJson('/api/v1/routines', [
            'title' => 'Private routine',
            'domain' => 'personal',
            'frequency' => 'daily',
        ])->assertCreated()->json('data.id');
        Sanctum::actingAs($owner);

        $this->patchJson("/api/v1/routines/{$routineId}", ['frequency' => 'weekly'])
            ->assertUnprocessable();
        $this->patchJson("/api/v1/routines/{$otherRoutineId}", ['title' => 'Hijacked'])
            ->assertNotFound();

        $this->getJson('/api/v1/routines')
            ->assertOk()
            ->assertJsonCount(1, 'data.routines')
            ->assertJsonPath('data.routines.0.is_scheduled_today', false)
            ->assertJsonPath('data.recent_completions', []);
    }

    public function test_weekly_review_summarizes_only_the_owner_previous_week_and_persists_next_week_focus(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 10:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $account = DB::table('finance_accounts')->insertGetId([
            'owner_id' => $owner->getAuthIdentifier(),
            'name' => 'Weekly review account',
            'type' => 'checking',
            'currency' => 'EUR',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('finance_transactions')->insert([
            ['owner_id' => $owner->getAuthIdentifier(), 'account_id' => $account, 'type' => 'income', 'amount' => '2500.0000', 'currency' => 'EUR', 'occurred_at' => '2026-09-08 09:00:00', 'created_at' => now(), 'updated_at' => now()],
            ['owner_id' => $owner->getAuthIdentifier(), 'account_id' => $account, 'type' => 'expense', 'amount' => '300.0000', 'currency' => 'EUR', 'occurred_at' => '2026-09-09 09:00:00', 'created_at' => now(), 'updated_at' => now()],
        ]);
        $otherAccount = DB::table('finance_accounts')->insertGetId([
            'owner_id' => $otherOwner->getAuthIdentifier(),
            'name' => 'Other account',
            'type' => 'checking',
            'currency' => 'EUR',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('finance_transactions')->insert([
            'owner_id' => $otherOwner->getAuthIdentifier(),
            'account_id' => $otherAccount,
            'type' => 'income',
            'amount' => '9000.0000',
            'currency' => 'EUR',
            'occurred_at' => '2026-09-08 09:00:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('nutrition_meals')->insert([
            'owner_id' => $owner->getAuthIdentifier(),
            'name' => 'Lunch',
            'meal_type' => 'lunch',
            'eaten_at' => '2026-09-10 12:00:00',
            'calories' => '650.00',
            'protein_grams' => '35.00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('nutrition_plan_items')->insert([
            'owner_id' => $owner->getAuthIdentifier(),
            'recipe_name' => 'Planned lunch',
            'plan_date' => '2026-09-11',
            'meal_slot' => 'lunch',
            'status' => 'planned',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        FitnessWorkoutSession::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'status' => 'completed',
            'started_at' => '2026-09-12 10:00:00',
            'completed_at' => '2026-09-12 11:00:00',
            'duration_minutes' => 60,
        ]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/dashboard/weekly-review')
            ->assertOk()
            ->assertJsonPath('data.week_start', '2026-09-07')
            ->assertJsonPath('data.week_end', '2026-09-13')
            ->assertJsonPath('data.finance.transaction_count', 2)
            ->assertJsonPath('data.finance.totals.0.income', '2500.0000')
            ->assertJsonPath('data.finance.totals.0.expenses', '300.0000')
            ->assertJsonPath('data.fitness.completed_workouts', 1)
            ->assertJsonPath('data.fitness.workout_minutes', 60)
            ->assertJsonPath('data.nutrition.meals_logged', 1)
            ->assertJsonPath('data.nutrition.planned_meals', 1)
            ->assertJsonPath('data.nutrition.calories', '650.00');

        $this->putJson('/api/v1/dashboard/weekly-review', [
            'week_start' => '2026-09-07',
            'notes' => 'Keep lunch prep simple.',
            'next_week_focus' => 'Plan two strength sessions.',
        ])->assertOk()
            ->assertJsonPath('data.week_start', '2026-09-07')
            ->assertJsonPath('data.notes', 'Keep lunch prep simple.')
            ->assertJsonPath('data.next_week_focus', 'Plan two strength sessions.');

        $this->getJson('/api/v1/dashboard/weekly-review')
            ->assertOk()
            ->assertJsonPath('data.review.notes', 'Keep lunch prep simple.')
            ->assertJsonPath('data.review.next_week_focus', 'Plan two strength sessions.');
    }

    public function test_routine_and_review_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/routines')->assertUnauthorized();
        $this->postJson('/api/v1/routines')->assertUnauthorized();
        $this->getJson('/api/v1/dashboard/weekly-review')->assertUnauthorized();
    }

    public function test_weekly_review_does_not_treat_missing_measurements_as_zero(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 10:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        DB::table('nutrition_meals')->insert([
            'owner_id' => $owner->getAuthIdentifier(),
            'name' => 'Unmeasured meal',
            'meal_type' => 'lunch',
            'eaten_at' => '2026-09-10 12:00:00',
            'calories' => null,
            'protein_grams' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        FitnessWorkoutSession::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'status' => 'completed',
            'completed_at' => '2026-09-12 11:00:00',
            'duration_minutes' => null,
        ]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/dashboard/weekly-review')
            ->assertOk()
            ->assertJsonPath('data.fitness.completed_workouts', 1)
            ->assertJsonPath('data.fitness.workout_minutes', null)
            ->assertJsonPath('data.nutrition.meals_logged', 1)
            ->assertJsonPath('data.nutrition.calories', null)
            ->assertJsonPath('data.nutrition.protein_grams', null);
    }
}
