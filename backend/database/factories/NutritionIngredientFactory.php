<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Nutrition\Models\NutritionIngredient;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NutritionIngredient> */
class NutritionIngredientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->word(),
            'default_unit' => 'g',
        ];
    }
}
