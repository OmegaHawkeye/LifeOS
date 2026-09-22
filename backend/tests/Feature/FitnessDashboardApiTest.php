<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessBodyMetric;
use App\Modules\Fitness\Models\FitnessGoal;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use App\Modules\Fitness\Models\FitnessWorkoutSessionExercise;
use App\Modules\Fitness\Models\FitnessWorkoutSet;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FitnessDashboardApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_owner_gets_measurement_trends_goals_records_adherence_and_next_plan(): void
    {
        $this->travelTo(Carbon::parse('2026-09-20 12:00:00', 'Europe/Vienna'));
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Sanctum::actingAs($owner);

        FitnessBodyMetric::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'metric_type' => 'weight',
            'value' => 82,
            'unit' => 'kg',
            'measured_at' => '2026-08-01 08:00:00',
            'source' => 'manual',
        ]);
        FitnessBodyMetric::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'metric_type' => 'weight',
            'value' => 80,
            'unit' => 'kg',
            'measured_at' => '2026-09-19 08:00:00',
            'source' => 'manual',
        ]);
        FitnessBodyMetric::factory()->create([
            'owner_id' => $otherOwner->getAuthIdentifier(),
            'metric_type' => 'weight',
            'value' => 100,
            'unit' => 'kg',
        ]);
        $goalId = FitnessGoal::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'metric_type' => 'weight',
            'target_value' => 75,
            'unit' => 'kg',
            'status' => 'active',
        ])->getKey();

        $mondayPlan = FitnessWorkoutTemplate::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'name' => 'Strength A',
            'scheduled_days' => [1, 4],
        ]);
        FitnessWorkoutTemplate::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'name' => 'Sunday mobility',
            'scheduled_days' => [7],
        ]);
        $this->completeWorkout($owner, $mondayPlan->getKey(), '2026-09-14 12:00:00', [
            ['weight' => 80, 'weight_unit' => 'kg', 'reps' => 5],
            ['weight' => 100, 'weight_unit' => 'kg', 'reps' => 1],
            ['weight' => 45, 'weight_unit' => 'lb', 'reps' => 8],
        ]);
        $this->completeWorkout($owner, null, '2026-09-19 12:00:00', []);

        $this->getJson('/api/v1/fitness/dashboard')
            ->assertOk()
            ->assertJsonPath('data.active_goals.0.id', $goalId)
            ->assertJsonPath('data.measurement_trends.0.metric_type', 'weight')
            ->assertJsonPath('data.measurement_trends.0.direction', 'down')
            ->assertJsonPath('data.measurement_trends.0.change', '-2.0000')
            ->assertJsonPath('data.weekly_workouts.planned', 3)
            ->assertJsonPath('data.weekly_workouts.completed', 2)
            ->assertJsonPath('data.weekly_workouts.missed', 1)
            ->assertJsonPath('data.weekly_workouts.streak_days', 1)
            ->assertJsonPath('data.personal_records.0.weight', '100')
            ->assertJsonPath('data.personal_records.0.weight_unit', 'kg')
            ->assertJsonPath('data.next_workout.name', 'Sunday mobility')
            ->assertJsonPath('data.next_workout.scheduled_for', '2026-09-20');
    }

    public function test_an_active_session_suppresses_a_second_recommended_start_and_other_owners_are_hidden(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        FitnessWorkoutTemplate::factory()->create([
            'owner_id' => $otherOwner->getAuthIdentifier(),
            'name' => 'Private plan',
            'scheduled_days' => [1],
        ]);
        FitnessWorkoutSession::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/fitness/dashboard')
            ->assertOk()
            ->assertJsonPath('data.active_goals', [])
            ->assertJsonPath('data.personal_records', [])
            ->assertJsonPath('data.next_workout', null);
    }

    public function test_fitness_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/v1/fitness/dashboard')->assertUnauthorized();
    }

    /** @param array<int, array{weight: int, weight_unit: string, reps: int}> $sets */
    private function completeWorkout(User $owner, ?int $templateId, string $startedAt, array $sets): void
    {
        $session = FitnessWorkoutSession::factory()->create([
            'owner_id' => $owner->getAuthIdentifier(),
            'template_id' => $templateId,
            'status' => 'completed',
            'started_at' => $startedAt,
            'completed_at' => $startedAt,
            'duration_minutes' => 45,
        ]);
        if ($sets === []) {
            return;
        }

        $exercise = FitnessWorkoutSessionExercise::factory()->create([
            'session_id' => $session->getKey(),
            'exercise_name' => 'Barbell squat',
            'position' => 0,
        ]);
        foreach ($sets as $index => $set) {
            FitnessWorkoutSet::factory()->create([
                'session_exercise_id' => $exercise->getKey(),
                'set_number' => $index + 1,
                ...$set,
            ]);
        }
    }
}
