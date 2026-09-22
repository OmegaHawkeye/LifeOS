<?php

namespace App\Modules\Nutrition\Models;

use Database\Factories\NutritionShoppingListFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NutritionShoppingList extends Model
{
    /** @use HasFactory<NutritionShoppingListFactory> */
    use HasFactory;

    protected $fillable = ['owner_id', 'name', 'start_date', 'end_date', 'unavailable_recipe_count'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'unavailable_recipe_count' => 'integer',
        ];
    }

    /** @return HasMany<NutritionShoppingItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(NutritionShoppingItem::class, 'shopping_list_id')->orderBy('store_section')->orderBy('normalized_name')->orderBy('unit');
    }
}
