<?php

namespace Database\Factories;

use App\Modules\Nutrition\Models\NutritionShoppingItem;
use App\Modules\Nutrition\Models\NutritionShoppingList;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NutritionShoppingItem> */
class NutritionShoppingItemFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'shopping_list_id' => NutritionShoppingList::factory(),
            'name' => fake()->word(),
            'normalized_name' => fake()->word(),
            'quantity' => 1,
            'unit' => 'piece',
            'store_section' => 'other',
            'is_checked' => false,
            'is_manual' => true,
            'quantity_warning' => false,
        ];
    }
}
