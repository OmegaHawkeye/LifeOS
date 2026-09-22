<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nutrition_recipes', function (Blueprint $table): void {
            $table->text('dietary_notes')->nullable();
        });

        Schema::table('nutrition_ingredients', function (Blueprint $table): void {
            $table->string('normalized_name', 160)->nullable();
        });

        foreach (DB::table('nutrition_ingredients')->orderBy('id')->get() as $ingredient) {
            $normalized = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $ingredient->name) ?? $ingredient->name));
            $existing = DB::table('nutrition_ingredients')
                ->where('owner_id', $ingredient->owner_id)
                ->where('normalized_name', $normalized)
                ->first();

            if ($existing) {
                foreach (DB::table('nutrition_recipe_ingredients')->where('ingredient_id', $ingredient->id)->get() as $pivot) {
                    $alreadyLinked = DB::table('nutrition_recipe_ingredients')
                        ->where('recipe_id', $pivot->recipe_id)
                        ->where('ingredient_id', $existing->id)
                        ->exists();
                    if (! $alreadyLinked) {
                        DB::table('nutrition_recipe_ingredients')->where('id', $pivot->id)->update(['ingredient_id' => $existing->id]);
                    } else {
                        DB::table('nutrition_recipe_ingredients')->where('id', $pivot->id)->delete();
                    }
                }
                DB::table('nutrition_ingredients')->where('id', $ingredient->id)->delete();

                continue;
            }

            DB::table('nutrition_ingredients')->where('id', $ingredient->id)->update(['normalized_name' => $normalized]);
        }

        Schema::table('nutrition_ingredients', function (Blueprint $table): void {
            $table->unique(['owner_id', 'normalized_name']);
        });
    }

    public function down(): void
    {
        Schema::table('nutrition_ingredients', function (Blueprint $table): void {
            $table->dropUnique(['owner_id', 'normalized_name']);
            $table->dropColumn('normalized_name');
        });

        Schema::table('nutrition_recipes', function (Blueprint $table): void {
            $table->dropColumn('dietary_notes');
        });
    }
};
