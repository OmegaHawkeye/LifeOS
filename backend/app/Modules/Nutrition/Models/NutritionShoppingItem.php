<?php

namespace App\Modules\Nutrition\Models;

use Database\Factories\NutritionShoppingItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NutritionShoppingItem extends Model
{
    public const STORE_SECTIONS = [
        'produce', 'meat-seafood', 'dairy', 'bakery', 'frozen', 'pantry', 'other',
    ];

    /** @use HasFactory<NutritionShoppingItemFactory> */
    use HasFactory;

    protected $fillable = [
        'shopping_list_id', 'name', 'normalized_name', 'quantity', 'unit', 'store_section',
        'is_checked', 'is_manual', 'quantity_warning',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'is_checked' => 'boolean',
            'is_manual' => 'boolean',
            'quantity_warning' => 'boolean',
        ];
    }

    /** @return BelongsTo<NutritionShoppingList, $this> */
    public function shoppingList(): BelongsTo
    {
        return $this->belongsTo(NutritionShoppingList::class, 'shopping_list_id');
    }
}
