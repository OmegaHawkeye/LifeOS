<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Nutrition\Models\NutritionRecipe;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NutritionRecipe> */
class NutritionRecipeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->words(3, true),
            'servings' => 2,
            'calories' => '350.00',
            'protein_grams' => '20.00',
            'carbohydrate_grams' => '45.00',
            'fat_grams' => '10.00',
            'tags' => ['quick'],
        ];
    }
}
