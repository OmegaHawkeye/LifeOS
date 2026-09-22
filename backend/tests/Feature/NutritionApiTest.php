<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class NutritionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_read_and_update_nutrition_target(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)
            ->getJson('/api/v1/nutrition/target')
            ->assertOk()
            ->assertJsonPath('data.calories', null);

        $this->actingAs($owner)
            ->patchJson('/api/v1/nutrition/target', [
                'calories' => 2200,
                'protein_grams' => 160,
                'notes' => 'Training day target',
            ])
            ->assertOk()
            ->assertJsonPath('data.calories', '2200.00')
            ->assertJsonPath('data.protein_grams', '160.00');
    }

    public function test_nutrition_dashboard_summarizes_local_day_week_adherence_and_review_actions(): void
    {
        $this->travelTo(Carbon::parse('2026-09-23 12:00:00', 'UTC'));
        $owner = User::factory()->create();
        $owner->settings()->create([
            'timezone' => 'Europe/Vienna',
            'currency' => 'EUR',
            'measurement_system' => 'metric',
            'theme' => 'system',
            'mask_sensitive_data_by_default' => true,
        ]);
        $this->actingAs($owner)->patchJson('/api/v1/nutrition/target', [
            'calories' => 2200,
            'protein_grams' => 160,
            'carbohydrate_grams' => 240,
            'fat_grams' => 70,
        ])->assertOk();

        $repeatRecipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Oat bowl',
            'servings' => 1,
            'calories' => 500,
            'protein_grams' => 40,
            'carbohydrate_grams' => 60,
            'fat_grams' => 12,
            'tags' => ['meal-prep'],
            'ingredients' => [['name' => 'Oats', 'quantity' => 100, 'unit' => 'g']],
        ])->assertCreated();
        $otherRecipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Pasta bowl',
            'servings' => 1,
            'calories' => 300,
            'protein_grams' => 15,
            'ingredients' => [['name' => 'Pasta', 'quantity' => 100, 'unit' => 'g']],
        ])->assertCreated();

        foreach ([
            [$repeatRecipe->json('data.id'), '2026-09-21', 'breakfast', 'planned', 1],
            [$repeatRecipe->json('data.id'), '2026-09-22', 'dinner', 'prepped', 2],
            [$otherRecipe->json('data.id'), '2026-09-23', 'lunch', 'skipped', 1],
            [$otherRecipe->json('data.id'), '2026-09-24', 'dinner', 'replaced', 1],
        ] as [$recipeId, $date, $slot, $status, $servings]) {
            $this->actingAs($owner)->postJson('/api/v1/nutrition/plans', [
                'recipe_id' => $recipeId,
                'plan_date' => $date,
                'meal_slot' => $slot,
                'servings' => $servings,
                'status' => $status,
            ])->assertCreated();
        }

        $this->actingAs($owner)->postJson('/api/v1/nutrition/meals', [
            'recipe_id' => $repeatRecipe->json('data.id'),
            'meal_type' => 'breakfast',
            'eaten_at' => '2026-09-22T22:30:00Z',
        ])->assertCreated()
            ->assertJsonPath('data.eaten_at', '2026-09-22T22:30:00.000000Z');
        $this->actingAs($owner)->getJson('/api/v1/nutrition/meals?date=2026-09-23')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Oat bowl');
        $this->actingAs($owner)->getJson('/api/v1/nutrition/meals?date=2026-09-22')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($owner)->postJson('/api/v1/nutrition/meals', [
            'name' => 'Saturday snack',
            'meal_type' => 'snack',
            'eaten_at' => '2026-09-26T10:00:00Z',
            'calories' => 200,
            'protein_grams' => 10,
        ])->assertCreated();

        $otherOwner = User::factory()->create();
        $this->actingAs($otherOwner)->postJson('/api/v1/nutrition/meals', [
            'name' => 'Private meal',
            'meal_type' => 'lunch',
            'eaten_at' => '2026-09-23T09:00:00Z',
            'calories' => 900,
        ])->assertCreated();

        $this->actingAs($owner)->getJson('/api/v1/nutrition/dashboard?week_start=2026-09-21')
            ->assertOk()
            ->assertJsonPath('data.today.date', '2026-09-23')
            ->assertJsonPath('data.today.plan.0.status', 'skipped')
            ->assertJsonPath('data.today.eaten.calories', '500.00')
            ->assertJsonPath('data.week.planned.calories', '1500.00')
            ->assertJsonPath('data.week.eaten.calories', '700.00')
            ->assertJsonPath('data.week.eaten.carbohydrate_grams', null)
            ->assertJsonPath('data.week.eaten.fat_grams', null)
            ->assertJsonPath('data.week.status_counts.skipped', 1)
            ->assertJsonPath('data.week.status_counts.replaced', 1)
            ->assertJsonPath('data.week.prep_needed_count', 1)
            ->assertJsonPath('data.week.shopping_list_missing', true)
            ->assertJsonPath('data.review.reusable_meals.0.recipe_name', 'Oat bowl')
            ->assertJsonPath('data.review.reusable_meals.0.planned_count', 2)
            ->assertJsonPath('data.review.planning_gaps.0', '2026-09-23')
            ->assertJsonPath('data.review.next_week.can_copy', true);
    }

    public function test_owner_can_create_recipe_and_log_a_recipe_based_meal(): void
    {
        $owner = User::factory()->create();

        $recipeResponse = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Oat bowl',
            'servings' => 2,
            'dietary_notes' => 'Contains dairy; vegetarian.',
            'instructions' => 'Mix and serve.',
            'calories' => 350,
            'protein_grams' => 20,
            'tags' => ['quick', 'high-protein'],
            'ingredients' => [
                ['name' => 'Oats', 'quantity' => 80, 'unit' => 'g'],
                ['name' => 'Milk', 'quantity' => 200, 'unit' => 'ml'],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.ingredients.0.name', 'Oats')
            ->assertJsonPath('data.dietary_notes', 'Contains dairy; vegetarian.')
            ->assertJsonPath('data.ingredients.0.quantity', 80);

        $recipeId = $recipeResponse->json('data.id');

        $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Overnight oats',
            'servings' => 1,
            'ingredients' => [
                ['name' => '  OATS   ', 'quantity' => 40, 'unit' => 'g'],
            ],
        ])->assertCreated()->assertJsonPath('data.ingredients.0.id', $recipeResponse->json('data.ingredients.0.id'));

        $this->actingAs($owner)->postJson('/api/v1/nutrition/meals', [
            'recipe_id' => $recipeId,
            'meal_type' => 'breakfast',
            'eaten_at' => '2026-09-19T08:00:00Z',
            'servings' => 1.5,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Oat bowl')
            ->assertJsonPath('data.calories', '525.00')
            ->assertJsonPath('data.protein_grams', '30.00');

        $this->actingAs($owner)
            ->getJson('/api/v1/nutrition/meals?date=2026-09-19')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_owner_can_log_free_form_meal_and_cannot_use_another_owners_recipe(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();

        $recipe = $this->actingAs($otherOwner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Private recipe',
            'servings' => 1,
            'calories' => 100,
            'ingredients' => [['name' => 'Rice', 'quantity' => 50, 'unit' => 'g']],
        ])->assertCreated();

        $this->actingAs($owner)->postJson('/api/v1/nutrition/meals', [
            'recipe_id' => $recipe->json('data.id'),
            'meal_type' => 'lunch',
            'eaten_at' => '2026-09-19T12:00:00Z',
            'servings' => 1,
        ])->assertNotFound();

        $this->actingAs($owner)->postJson('/api/v1/nutrition/meals', [
            'name' => 'Lunch out',
            'meal_type' => 'lunch',
            'eaten_at' => '2026-09-19T12:00:00Z',
            'calories' => 620,
            'protein_grams' => 35,
            'notes' => 'Free-form meal',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Lunch out')
            ->assertJsonPath('data.recipe_id', null)
            ->assertJsonPath('data.calories', '620.00');
    }

    public function test_owner_can_plan_meals_update_status_and_duplicate_a_week(): void
    {
        $owner = User::factory()->create();
        $recipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Oat bowl',
            'servings' => 2,
            'calories' => 350,
            'protein_grams' => 20,
            'ingredients' => [['name' => 'Oats', 'quantity' => 80, 'unit' => 'g']],
        ])->assertCreated();

        $planned = $this->actingAs($owner)->postJson('/api/v1/nutrition/plans', [
            'recipe_id' => $recipe->json('data.id'),
            'plan_date' => '2026-09-14',
            'meal_slot' => 'breakfast',
            'servings' => 1.5,
        ])->assertCreated()
            ->assertJsonPath('data.calories', '525.00')
            ->assertJsonPath('data.status', 'planned');

        $this->actingAs($owner)->patchJson('/api/v1/nutrition/plans/'.$planned->json('data.id'), [
            'status' => 'prepped',
        ])->assertOk()->assertJsonPath('data.status', 'prepped');

        $this->actingAs($owner)->getJson('/api/v1/nutrition/plans?week_start=2026-09-14')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.plan_date', '2026-09-14')
            ->assertJsonPath('data.0.status', 'prepped');

        $this->actingAs($owner)->postJson('/api/v1/nutrition/plans/copy', [
            'source_week_start' => '2026-09-14',
            'target_week_start' => '2026-09-21',
        ])->assertCreated()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.plan_date', '2026-09-21')
            ->assertJsonPath('data.0.status', 'planned');
    }

    public function test_meal_plan_copy_requires_a_monday_and_an_empty_destination_week(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->postJson('/api/v1/nutrition/plans/copy', [
            'source_week_start' => '2026-09-15',
            'target_week_start' => '2026-09-21',
        ])->assertUnprocessable();

        $recipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Lunch bowl',
            'servings' => 1,
            'ingredients' => [['name' => 'Rice', 'quantity' => 100, 'unit' => 'g']],
        ])->assertCreated();
        $this->actingAs($owner)->postJson('/api/v1/nutrition/plans', [
            'recipe_id' => $recipe->json('data.id'),
            'plan_date' => '2026-09-21',
            'meal_slot' => 'lunch',
        ])->assertCreated();

        $this->actingAs($owner)->postJson('/api/v1/nutrition/plans/copy', [
            'source_week_start' => '2026-09-14',
            'target_week_start' => '2026-09-21',
        ])->assertUnprocessable();
    }

    public function test_owner_cannot_add_another_owners_recipe_to_a_meal_plan(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $recipe = $this->actingAs($otherOwner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Private recipe',
            'servings' => 1,
            'ingredients' => [['name' => 'Rice', 'quantity' => 100, 'unit' => 'g']],
        ])->assertCreated();

        $this->actingAs($owner)->postJson('/api/v1/nutrition/plans', [
            'recipe_id' => $recipe->json('data.id'),
            'plan_date' => '2026-09-21',
            'meal_slot' => 'lunch',
        ])->assertNotFound();
    }

    public function test_owner_can_generate_a_shopping_list_and_flag_incompatible_units(): void
    {
        $owner = User::factory()->create();
        $firstRecipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Oat bowl',
            'servings' => 2,
            'ingredients' => [['name' => 'Oats', 'quantity' => 100, 'unit' => 'g']],
        ])->assertCreated();
        $secondRecipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Overnight oats',
            'servings' => 1,
            'ingredients' => [
                ['name' => ' oats ', 'quantity' => 50, 'unit' => ' G '],
                ['name' => 'Milk', 'quantity' => 200, 'unit' => 'ml'],
            ],
        ])->assertCreated();
        $thirdRecipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Oat smoothie',
            'servings' => 1,
            'ingredients' => [['name' => 'Oats', 'quantity' => 1, 'unit' => 'cup']],
        ])->assertCreated();

        foreach ([
            [$firstRecipe->json('data.id'), '2026-09-21', '1.5'],
            [$secondRecipe->json('data.id'), '2026-09-22', '1'],
            [$thirdRecipe->json('data.id'), '2026-09-23', '1'],
        ] as [$recipeId, $date, $servings]) {
            $this->actingAs($owner)->postJson('/api/v1/nutrition/plans', [
                'recipe_id' => $recipeId,
                'plan_date' => $date,
                'meal_slot' => 'breakfast',
                'servings' => $servings,
            ])->assertCreated();
        }

        $list = $this->actingAs($owner)->postJson('/api/v1/nutrition/shopping-lists/generate', [
            'start_date' => '2026-09-21',
            'end_date' => '2026-09-27',
        ])->assertCreated()
            ->assertJsonPath('data.unavailable_recipe_count', 0);

        $items = collect($list->json('data.items'));
        $grams = $items->firstWhere('unit', 'g');
        $cups = $items->firstWhere('unit', 'cup');

        $this->assertSame('125.0000', $grams['quantity']);
        $this->assertTrue($grams['quantity_warning']);
        $this->assertSame('1.0000', $cups['quantity']);
        $this->assertTrue($cups['quantity_warning']);
        $this->assertSame('200.0000', $items->firstWhere('name', 'Milk')['quantity']);
    }

    public function test_shopping_list_items_can_be_manually_added_checked_edited_and_removed(): void
    {
        $owner = User::factory()->create();
        $recipe = $this->actingAs($owner)->postJson('/api/v1/nutrition/recipes', [
            'name' => 'Lunch bowl',
            'servings' => 1,
            'ingredients' => [['name' => 'Rice', 'quantity' => 100, 'unit' => 'g']],
        ])->assertCreated();
        $this->actingAs($owner)->postJson('/api/v1/nutrition/plans', [
            'recipe_id' => $recipe->json('data.id'),
            'plan_date' => '2026-09-21',
            'meal_slot' => 'lunch',
        ])->assertCreated();
        $list = $this->actingAs($owner)->postJson('/api/v1/nutrition/shopping-lists/generate', [
            'start_date' => '2026-09-21',
            'end_date' => '2026-09-27',
        ])->assertCreated();
        $listId = $list->json('data.id');

        $item = $this->actingAs($owner)->postJson("/api/v1/nutrition/shopping-lists/{$listId}/items", [
            'name' => 'Olive oil',
            'quantity' => 1,
            'unit' => 'bottle',
            'store_section' => 'pantry',
        ])->assertCreated()->assertJsonPath('data.is_manual', true);
        $itemId = $item->json('data.id');

        $this->actingAs($owner)->postJson("/api/v1/nutrition/shopping-lists/{$listId}/items", [
            'name' => ' rice ',
            'quantity' => 50,
            'unit' => ' G ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Rice')
            ->assertJsonPath('data.quantity', '150.0000')
            ->assertJsonPath('data.is_manual', true);

        $unknownUnit = $this->actingAs($owner)->postJson("/api/v1/nutrition/shopping-lists/{$listId}/items", [
            'name' => 'Rice',
            'quantity' => 1,
        ])->assertCreated()->assertJsonPath('data.quantity_warning', true);
        $riceItem = collect($list->json('data.items'))->firstWhere('name', 'Rice');
        $this->assertDatabaseHas('nutrition_shopping_items', [
            'id' => $riceItem['id'],
            'quantity_warning' => true,
        ]);
        $this->assertNotSame($riceItem['id'], $unknownUnit->json('data.id'));

        $this->actingAs($owner)->patchJson("/api/v1/nutrition/shopping-lists/{$listId}/items/{$itemId}", [
            'is_checked' => true,
            'name' => 'Extra virgin olive oil',
            'store_section' => 'produce',
        ])->assertOk()
            ->assertJsonPath('data.is_checked', true)
            ->assertJsonPath('data.name', 'Extra virgin olive oil')
            ->assertJsonPath('data.store_section', 'produce');

        $this->actingAs($owner)->deleteJson("/api/v1/nutrition/shopping-lists/{$listId}/items/{$itemId}")
            ->assertNoContent();
    }
}
