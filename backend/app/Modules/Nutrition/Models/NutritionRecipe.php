<?php

namespace App\Modules\Nutrition\Models;

use Database\Factories\NutritionRecipeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class NutritionRecipe extends Model
{
    /** @use HasFactory<NutritionRecipeFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_id', 'name', 'description', 'dietary_notes', 'servings', 'instructions',
        'calories', 'protein_grams', 'carbohydrate_grams', 'fat_grams',
        'micronutrients', 'tags',
    ];

    protected function casts(): array
    {
        return [
            'calories' => 'decimal:2',
            'protein_grams' => 'decimal:2',
            'carbohydrate_grams' => 'decimal:2',
            'fat_grams' => 'decimal:2',
            'micronutrients' => 'array',
            'tags' => 'array',
        ];
    }

    /** @return BelongsToMany<NutritionIngredient, $this> */
    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(NutritionIngredient::class, 'nutrition_recipe_ingredients', 'recipe_id', 'ingredient_id')
            ->withPivot(['quantity', 'unit', 'position'])
            ->withTimestamps()
            ->orderByPivot('position');
    }
}
