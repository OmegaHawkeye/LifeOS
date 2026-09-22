<?php

namespace App\Modules\Nutrition\Models;

use Database\Factories\NutritionPlanItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NutritionPlanItem extends Model
{
    /** @use HasFactory<NutritionPlanItemFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_id', 'recipe_id', 'recipe_name', 'plan_date', 'meal_slot', 'servings', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'plan_date' => 'date:Y-m-d',
            'servings' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<NutritionRecipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(NutritionRecipe::class);
    }
}
