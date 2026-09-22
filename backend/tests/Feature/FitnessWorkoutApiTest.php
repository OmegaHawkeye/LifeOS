<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FitnessWorkoutApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_owner_can_create_reuse_and_complete_a_workout_template(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $exerciseId = $this->postJson('/api/v1/fitness/exercises', [
            'name' => 'Barbell squat',
            'muscle_group' => 'legs',
            'equipment' => 'barbell',
        ])->assertCreated()->assertJsonPath('data.name', 'Barbell squat')->json('data.id');

        $templateId = $this->postJson('/api/v1/fitness/workout-templates', [
            'name' => 'Lower body A',
            'scheduled_days' => [1, 4],
            'exercises' => [[
                'exercise_id' => $exerciseId,
                'position' => 0,
                'target_sets' => 3,
                'target_reps' => '8-10',
                'target_weight' => 60,
                'target_weight_unit' => 'kg',
            ]],
        ])->assertCreated()
            ->assertJsonPath('data.scheduled_days.0', 1)
            ->assertJsonPath('data.exercises.0.target_weight_unit', 'kg')
            ->assertJsonPath('data.exercises.0.exercise.name', 'Barbell squat')
            ->json('data.id');

        $sessionResponse = $this->postJson('/api/v1/fitness/workout-sessions', [
            'template_id' => $templateId,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.exercises.0.exercise.name', 'Barbell squat');
        $firstSessionId = $sessionResponse->json('data.id');
        $sessionExerciseId = $sessionResponse->json('data.exercises.0.id');

        $firstSetId = $this->postJson(
            "/api/v1/fitness/workout-sessions/{$firstSessionId}/exercises/{$sessionExerciseId}/sets",
            ['reps' => 10, 'weight' => 60, 'weight_unit' => 'kg', 'rpe' => 8],
        )->assertCreated()
            ->assertJsonPath('data.set_number', 1)
            ->assertJsonPath('data.weight_unit', 'kg')
            ->json('data.id');
        $this->assertNotNull($firstSetId);

        $this->postJson(
            "/api/v1/fitness/workout-sessions/{$firstSessionId}/exercises/{$sessionExerciseId}/sets",
            ['reps' => 8, 'weight' => 62.5, 'weight_unit' => 'kg', 'rpe' => 9],
        )->assertCreated()->assertJsonPath('data.set_number', 2);

        $this->postJson("/api/v1/fitness/workout-sessions/{$firstSessionId}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.exercises.0.sets.1.reps', 8)
            ->assertJsonPath('data.exercises.0.sets.1.weight', '62.50');

        $secondSessionId = $this->postJson('/api/v1/fitness/workout-sessions', [
            'template_id' => $templateId,
        ])->assertCreated()->json('data.id');
        $this->getJson("/api/v1/fitness/exercises/{$exerciseId}/recent-performance")
            ->assertOk()
            ->assertJsonPath('data.session.id', $firstSessionId)
            ->assertJsonPath('data.sets.1.reps', 8)
            ->assertJsonPath('data.sets.1.weight', '62.50');

        $this->assertNotNull($secondSessionId);
    }

    public function test_owner_can_build_an_ad_hoc_session_and_other_owners_cannot_read_it(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $exerciseId = $this->postJson('/api/v1/fitness/exercises', [
            'name' => 'Dumbbell row',
        ])->assertCreated()->json('data.id');
        $sessionId = $this->postJson('/api/v1/fitness/workout-sessions', [
            'name' => 'Quick session',
            'notes' => 'Lunch break',
        ])->assertCreated()
            ->assertJsonPath('data.template_id', null)
            ->json('data.id');

        $this->postJson("/api/v1/fitness/workout-sessions/{$sessionId}/exercises", [
            'exercise_id' => $exerciseId,
        ])->assertCreated()->assertJsonPath('data.exercises.0.exercise.name', 'Dumbbell row');

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/fitness/workout-sessions')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/fitness/workout-sessions/{$sessionId}/complete")
            ->assertNotFound();
    }

    public function test_workout_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/fitness/exercises')->assertUnauthorized();
        $this->postJson('/api/v1/fitness/exercises')->assertUnauthorized();
        $this->getJson('/api/v1/fitness/workout-templates')->assertUnauthorized();
        $this->postJson('/api/v1/fitness/workout-templates')->assertUnauthorized();
        $this->getJson('/api/v1/fitness/workout-sessions')->assertUnauthorized();
        $this->postJson('/api/v1/fitness/workout-sessions')->assertUnauthorized();
    }
}
