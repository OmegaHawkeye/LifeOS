<?php

namespace App\Modules\Nutrition\Application;

use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use App\Modules\Nutrition\Models\NutritionIngredient;
use App\Modules\Nutrition\Models\NutritionMeal;
use App\Modules\Nutrition\Models\NutritionRecipe;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ManageNutritionLibrary
{
    public function __construct(private readonly ManageOwnerSettings $ownerSettings) {}

    /** @return Collection<int, NutritionRecipe> */
    public function recipes(int $ownerId): Collection
    {
        return NutritionRecipe::query()
            ->where('owner_id', $ownerId)
            ->with('ingredients')
            ->orderBy('name')
            ->get();
    }

    /** @param array<string, mixed> $data */
    public function createRecipe(int $ownerId, array $data): NutritionRecipe
    {
        return DB::transaction(function () use ($ownerId, $data): NutritionRecipe {
            $ingredients = $data['ingredients'];
            unset($data['ingredients']);
            $recipe = NutritionRecipe::query()->create([...$data, 'owner_id' => $ownerId]);
            $this->syncRecipeIngredients($ownerId, $recipe, $ingredients);

            return $recipe->load('ingredients');
        });
    }

    /** @param array<string, mixed> $data */
    public function updateRecipe(int $ownerId, int $recipeId, array $data): NutritionRecipe
    {
        return DB::transaction(function () use ($ownerId, $recipeId, $data): NutritionRecipe {
            $recipe = NutritionRecipe::query()->where('owner_id', $ownerId)->findOrFail($recipeId);
            if (array_key_exists('ingredients', $data)) {
                $ingredients = $data['ingredients'];
                unset($data['ingredients']);
                $this->syncRecipeIngredients($ownerId, $recipe, $ingredients);
            }
            $recipe->update($data);

            return $recipe->refresh()->load('ingredients');
        });
    }

    /** @return Collection<int, NutritionMeal> */
    public function meals(int $ownerId, ?string $date): Collection
    {
        $query = NutritionMeal::query()
            ->where('owner_id', $ownerId)
            ->with('recipe')
            ->orderByDesc('eaten_at');
        if ($date !== null) {
            $timezone = $this->ownerSettings->timezoneForOwnerId($ownerId);
            $dayStart = CarbonImmutable::parse($date, $timezone)->startOfDay();
            $query->whereBetween('eaten_at', [$dayStart->utc(), $dayStart->endOfDay()->utc()]);
        }

        return $query->get();
    }

    /** @param array<string, mixed> $data */
    public function logMeal(int $ownerId, array $data): NutritionMeal
    {
        $data['eaten_at'] = CarbonImmutable::parse($data['eaten_at'])->utc();

        if (! empty($data['recipe_id'])) {
            $recipe = NutritionRecipe::query()->where('owner_id', $ownerId)->findOrFail($data['recipe_id']);
            $servings = (float) ($data['servings'] ?? 1);
            $data['name'] = $recipe->name;
            foreach (['calories', 'protein_grams', 'carbohydrate_grams', 'fat_grams'] as $nutrient) {
                $data[$nutrient] = $recipe->{$nutrient} === null ? null : (float) $recipe->{$nutrient} * $servings;
            }
        }

        return NutritionMeal::query()->create([...$data, 'owner_id' => $ownerId]);
    }

    /** @param array<int, array{name: string, quantity: numeric-string|int|float, unit: string}> $ingredients */
    private function syncRecipeIngredients(int $ownerId, NutritionRecipe $recipe, array $ingredients): void
    {
        $sync = [];
        foreach ($ingredients as $position => $ingredientData) {
            $name = trim(preg_replace('/\s+/u', ' ', $ingredientData['name']) ?? $ingredientData['name']);
            $normalizedName = mb_strtolower($name);
            $ingredient = NutritionIngredient::query()->firstOrCreate(
                ['owner_id' => $ownerId, 'normalized_name' => $normalizedName],
                ['name' => $name, 'default_unit' => $ingredientData['unit']],
            );
            $sync[$ingredient->id] = [
                'quantity' => $ingredientData['quantity'],
                'unit' => $ingredientData['unit'],
                'position' => $position,
            ];
        }
        $recipe->ingredients()->sync($sync);
    }
}
