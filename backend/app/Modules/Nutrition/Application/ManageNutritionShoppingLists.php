<?php

namespace App\Modules\Nutrition\Application;

use App\Modules\Nutrition\Models\NutritionPlanItem;
use App\Modules\Nutrition\Models\NutritionShoppingItem;
use App\Modules\Nutrition\Models\NutritionShoppingList;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ManageNutritionShoppingLists
{
    /** @return Collection<int, NutritionShoppingList> */
    public function lists(int|string $ownerId): Collection
    {
        return NutritionShoppingList::query()
            ->where('owner_id', $ownerId)
            ->with('items')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }

    /** @param array{start_date: string, end_date: string, name?: string|null} $generationData */
    public function generate(int|string $ownerId, array $generationData): NutritionShoppingList
    {
        return DB::transaction(function () use ($ownerId, $generationData): NutritionShoppingList {
            $planItems = NutritionPlanItem::query()
                ->where('owner_id', $ownerId)
                ->whereBetween('plan_date', [$generationData['start_date'], $generationData['end_date']])
                ->whereNotIn('status', ['skipped', 'replaced'])
                ->with('recipe.ingredients')
                ->get();

            $groups = [];
            $unavailableRecipeCount = 0;
            foreach ($planItems as $planItem) {
                $recipe = $planItem->recipe;
                if ($recipe === null) {
                    $unavailableRecipeCount++;

                    continue;
                }

                $servingMultiplier = (float) $planItem->servings / max(1, (int) $recipe->servings);
                foreach ($recipe->ingredients as $ingredient) {
                    $normalizedName = $this->normalize($ingredient->name);
                    $unit = trim((string) $ingredient->pivot->getAttribute('unit'));
                    $normalizedUnit = $this->normalize($unit);
                    $key = $normalizedName.'|'.$normalizedUnit;
                    if ($normalizedUnit === '') {
                        $key .= '|plan-'.$planItem->id.'-ingredient-'.$ingredient->id;
                    }
                    $quantity = (float) $ingredient->pivot->getAttribute('quantity') * $servingMultiplier;

                    if (! isset($groups[$key])) {
                        $groups[$key] = [
                            'name' => $ingredient->name,
                            'normalized_name' => $normalizedName,
                            'quantity' => 0.0,
                            'unit' => $unit,
                        ];
                    }
                    $groups[$key]['quantity'] += $quantity;
                }
            }

            $list = NutritionShoppingList::query()->create([
                'owner_id' => $ownerId,
                'name' => $generationData['name'] ?? 'Shopping list',
                'start_date' => $generationData['start_date'],
                'end_date' => $generationData['end_date'],
                'unavailable_recipe_count' => $unavailableRecipeCount,
            ]);

            $unitsByIngredient = [];
            $missingUnitCounts = [];
            foreach ($groups as $group) {
                $normalizedUnit = $this->normalize($group['unit']);
                $unitsByIngredient[$group['normalized_name']][$normalizedUnit] = true;
                if ($normalizedUnit === '') {
                    $missingUnitCounts[$group['normalized_name']] = ($missingUnitCounts[$group['normalized_name']] ?? 0) + 1;
                }
            }
            foreach ($groups as $group) {
                $unitCount = count($unitsByIngredient[$group['normalized_name']]);
                $list->items()->create([
                    ...$group,
                    'store_section' => 'other',
                    'is_checked' => false,
                    'is_manual' => false,
                    'quantity_warning' => $unitCount > 1 || ($missingUnitCounts[$group['normalized_name']] ?? 0) > 1,
                ]);
            }

            return $list->load('items');
        });
    }

    /** @param array<string, mixed> $itemData */
    public function addManualItem(int|string $ownerId, int $listId, array $itemData): NutritionShoppingItem
    {
        $list = $this->ownedList($ownerId, $listId);
        $name = trim(preg_replace('/\s+/u', ' ', $itemData['name']) ?? $itemData['name']);
        $normalizedName = $this->normalize($name);
        $unit = isset($itemData['unit']) ? trim($itemData['unit']) : null;
        if (isset($itemData['quantity']) && $unit !== null) {
            $matchingItem = $list->items()->where('normalized_name', $normalizedName)->get()
                ->first(fn (NutritionShoppingItem $existing): bool => $existing->unit !== null
                    && $this->normalize($existing->unit) === $this->normalize($unit));
            if ($matchingItem !== null && $matchingItem->quantity !== null) {
                $matchingItem->update([
                    'quantity' => (float) $matchingItem->quantity + (float) $itemData['quantity'],
                    'is_manual' => true,
                ]);
                $this->refreshQuantityWarnings($list);

                return $matchingItem->refresh();
            }
        }

        $item = $list->items()->create([
            ...$itemData,
            'name' => $name,
            'normalized_name' => $normalizedName,
            'unit' => $unit,
            'store_section' => $itemData['store_section'] ?? 'other',
            'is_checked' => false,
            'is_manual' => true,
            'quantity_warning' => false,
        ]);
        $this->refreshQuantityWarnings($list);

        return $item->refresh();
    }

    /** @param array<string, mixed> $itemData */
    public function updateItem(int|string $ownerId, int $listId, int $itemId, array $itemData): NutritionShoppingItem
    {
        $list = $this->ownedList($ownerId, $listId);
        $item = $list->items()->findOrFail($itemId);
        if (isset($itemData['name'])) {
            $itemData['name'] = trim(preg_replace('/\s+/u', ' ', $itemData['name']) ?? $itemData['name']);
            $itemData['normalized_name'] = $this->normalize($itemData['name']);
        }
        $item->update($itemData);
        $this->refreshQuantityWarnings($list);

        return $item->refresh();
    }

    public function removeItem(int|string $ownerId, int $listId, int $itemId): void
    {
        $list = $this->ownedList($ownerId, $listId);
        $list->items()->findOrFail($itemId)->delete();
        $this->refreshQuantityWarnings($list);
    }

    private function ownedList(int|string $ownerId, int $listId): NutritionShoppingList
    {
        return NutritionShoppingList::query()->where('owner_id', $ownerId)->findOrFail($listId);
    }

    private function normalize(string $value): string
    {
        $collapsed = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);

        return mb_strtolower($collapsed);
    }

    private function refreshQuantityWarnings(NutritionShoppingList $list): void
    {
        $items = $list->items()->get();
        $unitsByIngredient = [];
        $missingUnitCounts = [];
        foreach ($items as $item) {
            $normalizedUnit = $this->normalize((string) $item->unit);
            $unitsByIngredient[$item->normalized_name][$normalizedUnit] = true;
            if ($normalizedUnit === '') {
                $missingUnitCounts[$item->normalized_name] = ($missingUnitCounts[$item->normalized_name] ?? 0) + 1;
            }
        }
        foreach ($items as $item) {
            $item->update([
                'quantity_warning' => count($unitsByIngredient[$item->normalized_name] ?? []) > 1
                    || ($missingUnitCounts[$item->normalized_name] ?? 0) > 1,
            ]);
        }
    }
}
