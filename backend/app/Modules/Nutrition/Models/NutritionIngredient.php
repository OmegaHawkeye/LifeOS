<?php

namespace App\Modules\Nutrition\Models;

use Database\Factories\NutritionIngredientFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Pivot;

/** @property-read Pivot $pivot */
class NutritionIngredient extends Model
{
    /** @use HasFactory<NutritionIngredientFactory> */
    use HasFactory;

    protected $fillable = ['owner_id', 'name', 'normalized_name', 'default_unit'];
}
