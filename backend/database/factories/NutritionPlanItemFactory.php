<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Nutrition\Models\NutritionPlanItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NutritionPlanItem> */
class NutritionPlanItemFactory extends Factory
{
    protected $model = NutritionPlanItem::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'recipe_id' => null,
            'recipe_name' => fake()->words(2, true),
            'plan_date' => fake()->dateTimeBetween('monday this week', 'sunday this week')->format('Y-m-d'),
            'meal_slot' => fake()->randomElement(['breakfast', 'lunch', 'dinner', 'snack']),
            'servings' => 1,
            'status' => 'planned',
            'notes' => null,
        ];
    }
}
