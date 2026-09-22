<?php

namespace App\Modules\Nutrition\Models;

use Illuminate\Database\Eloquent\Model;

class NutritionTarget extends Model
{
    protected $fillable = [
        'owner_id',
        'calories',
        'protein_grams',
        'carbohydrate_grams',
        'fat_grams',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'calories' => 'decimal:2',
            'protein_grams' => 'decimal:2',
            'carbohydrate_grams' => 'decimal:2',
            'fat_grams' => 'decimal:2',
        ];
    }
}
