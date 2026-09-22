<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Nutrition\Models\NutritionShoppingList;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NutritionShoppingList> */
class NutritionShoppingListFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => 'Weekly groceries',
            'start_date' => now()->startOfWeek()->toDateString(),
            'end_date' => now()->endOfWeek()->toDateString(),
            'unavailable_recipe_count' => 0,
        ];
    }
}
