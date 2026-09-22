<?php

namespace App\Modules\Nutrition\Models;

use Database\Factories\NutritionMealFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NutritionMeal extends Model
{
    /** @use HasFactory<NutritionMealFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_id', 'recipe_id', 'name', 'meal_type', 'eaten_at', 'servings',
        'calories', 'protein_grams', 'carbohydrate_grams', 'fat_grams', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'eaten_at' => 'immutable_datetime',
            'servings' => 'decimal:2',
            'calories' => 'decimal:2',
            'protein_grams' => 'decimal:2',
            'carbohydrate_grams' => 'decimal:2',
            'fat_grams' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<NutritionRecipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(NutritionRecipe::class);
    }
}
