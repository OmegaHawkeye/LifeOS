<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MvpCrossModuleIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_capture_a_week_across_modules_and_review_persisted_results(): void
    {
        $this->travelTo(Carbon::parse('2026-09-06 10:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $accountId = $this->postJson('/api/v1/finance/accounts', [
            'name' => 'Everyday account',
            'type' => 'checking',
            'currency' => 'EUR',
            'opening_balance' => '800.00',
        ])->assertCreated()->json('data.id');
        $categoryId = $this->postJson('/api/v1/finance/categories', [
            'name' => 'Groceries',
            'type' => 'expense',
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/finance/transactions', [
            'account_id' => $accountId,
            'category_id' => $categoryId,
            'type' => 'expense',
            'amount' => '45.90',
            'description' => 'Weekly groceries',
            'occurred_at' => '2026-09-01T17:00:00+02:00',
        ])->assertCreated();

        $this->postJson('/api/v1/fitness/body-metrics', [
            'metric_type' => 'weight',
            'value' => 81.4,
            'unit' => 'kg',
            'measured_at' => '2026-09-02T07:00:00+02:00',
        ])->assertCreated()->assertJsonPath('data.source', 'manual');
        $exerciseId = $this->postJson('/api/v1/fitness/exercises', [
            'name' => 'Goblet squat',
        ])->assertCreated()->json('data.id');
        $templateId = $this->postJson('/api/v1/fitness/workout-templates', [
            'name' => 'Strength A',
            'scheduled_days' => [7],
            'exercises' => [[
                'exercise_id' => $exerciseId,
                'position' => 0,
                'target_sets' => 3,
                'target_reps' => '8-10',
            ]],
        ])->assertCreated()->json('data.id');
        $session = $this->postJson('/api/v1/fitness/workout-sessions', [
            'template_id' => $templateId,
        ])->assertCreated();
        $sessionExerciseId = $session->json('data.exercises.0.id');
        $this->postJson("/api/v1/fitness/workout-sessions/{$session->json('data.id')}/exercises/{$sessionExerciseId}/sets", [
            'reps' => 10,
            'weight' => 20,
            'weight_unit' => 'kg',
        ])->assertCreated();
        $this->travel(45)->minutes();
        $this->postJson("/api/v1/fitness/workout-sessions/{$session->json('data.id')}/complete")
            ->assertOk()->assertJsonPath('data.status', 'completed');

        $recipeId = $this->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Protein oats',
            'servings' => 1,
            'calories' => 480,
            'protein_grams' => 35,
            'ingredients' => [['name' => 'Oats', 'quantity' => 80, 'unit' => 'g']],
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/nutrition/plans', [
            'recipe_id' => $recipeId,
            'plan_date' => '2026-09-03',
            'meal_slot' => 'breakfast',
            'servings' => 1,
        ])->assertCreated();
        $this->postJson('/api/v1/nutrition/meals', [
            'recipe_id' => $recipeId,
            'meal_type' => 'breakfast',
            'eaten_at' => '2026-09-03T07:30:00+02:00',
        ])->assertCreated()->assertJsonPath('data.calories', '480.00');

        $routineId = $this->postJson('/api/v1/routines', [
            'title' => 'Sunday weekly review',
            'domain' => 'personal',
            'frequency' => 'weekly',
            'days_of_week' => [7],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/routines/{$routineId}/complete")
            ->assertOk()->assertJsonPath('data.status', 'completed');

        $this->getJson('/api/v1/dashboard/weekly-review?week_start=2026-08-31')
            ->assertOk()
            ->assertJsonPath('data.week_start', '2026-08-31')
            ->assertJsonPath('data.week_end', '2026-09-06')
            ->assertJsonPath('data.finance.transaction_count', 1)
            ->assertJsonPath('data.finance.totals.0.expenses', '45.9000')
            ->assertJsonPath('data.fitness.completed_workouts', 1)
            ->assertJsonPath('data.fitness.workout_minutes', 45)
            ->assertJsonPath('data.nutrition.meals_logged', 1)
            ->assertJsonPath('data.nutrition.planned_meals', 1)
            ->assertJsonPath('data.nutrition.calories', '480.00');

        $this->putJson('/api/v1/dashboard/weekly-review', [
            'week_start' => '2026-08-31',
            'notes' => 'Logged the essential data.',
            'next_week_focus' => 'Keep the same rhythm.',
        ])->assertOk()->assertJsonPath('data.next_week_focus', 'Keep the same rhythm.');

        $this->getJson('/api/v1/dashboard/weekly-review?week_start=2026-08-31')
            ->assertOk()
            ->assertJsonPath('data.review.notes', 'Logged the essential data.')
            ->assertJsonPath('data.review.next_week_focus', 'Keep the same rhythm.');
    }
}
