<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Nutrition\Models\NutritionMeal;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NutritionMeal> */
class NutritionMealFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->words(2, true),
            'meal_type' => fake()->randomElement(['breakfast', 'lunch', 'dinner', 'snack']),
            'eaten_at' => now(),
            'servings' => '1.00',
            'calories' => '400.00',
        ];
    }
}
