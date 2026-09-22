<?php

namespace App\Modules\Nutrition\Application;

use App\Modules\Nutrition\Models\NutritionIngredient;
use App\Modules\Nutrition\Models\NutritionMeal;
use App\Modules\Nutrition\Models\NutritionPlanItem;
use App\Modules\Nutrition\Models\NutritionRecipe;
use App\Modules\Nutrition\Models\NutritionShoppingList;
use App\Modules\Nutrition\Models\NutritionTarget;
use Illuminate\Database\Eloquent\Relations\Relation;

class ExportNutritionData
{
    /** @return array<string, array<int, array<string, mixed>>> */
    public function forOwner(int|string $ownerId): array
    {
        return [
            'targets' => NutritionTarget::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'ingredients' => NutritionIngredient::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'recipes' => NutritionRecipe::query()
                ->where('owner_id', $ownerId)
                ->with(['ingredients' => function (Relation $relation) use ($ownerId): void {
                    $relation->getQuery()->where('owner_id', $ownerId);
                }])
                ->orderBy('id')
                ->get()
                ->toArray(),
            'meals' => NutritionMeal::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'plan_items' => NutritionPlanItem::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            'shopping_lists' => NutritionShoppingList::query()->where('owner_id', $ownerId)->with('items')->orderBy('id')->get()->toArray(),
        ];
    }
}
