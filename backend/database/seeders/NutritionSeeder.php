<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Nutrition\Application\ManageNutritionLibrary;
use App\Modules\Nutrition\Models\NutritionRecipe;
use Illuminate\Database\Seeder;

class NutritionSeeder extends Seeder
{
    public function run(ManageNutritionLibrary $library): void
    {
        $owner = User::query()->first();
        if ($owner === null) {
            return;
        }

        $recipe = NutritionRecipe::query()->firstOrCreate([
            'owner_id' => $owner->getKey(),
            'name' => 'Example protein oats',
        ], [
            'servings' => 1,
            'instructions' => 'Combine oats, milk, and Greek yogurt. Chill overnight.',
            'calories' => '420.00',
            'protein_grams' => '32.00',
            'carbohydrate_grams' => '52.00',
            'fat_grams' => '9.00',
            'tags' => ['example', 'high-protein', 'meal-prep'],
        ]);

        if ($recipe->ingredients()->doesntExist()) {
            $library->updateRecipe($owner->getKey(), $recipe->getKey(), [
                'ingredients' => [
                    ['name' => 'Rolled oats', 'quantity' => 60, 'unit' => 'g'],
                    ['name' => 'Milk', 'quantity' => 150, 'unit' => 'ml'],
                    ['name' => 'Greek yogurt', 'quantity' => 100, 'unit' => 'g'],
                ],
            ]);
        }
    }
}
