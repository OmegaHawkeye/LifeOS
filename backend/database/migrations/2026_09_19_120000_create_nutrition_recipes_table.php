<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_recipes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('servings')->default(1);
            $table->text('instructions')->nullable();
            $table->decimal('calories', 10, 2)->nullable();
            $table->decimal('protein_grams', 10, 2)->nullable();
            $table->decimal('carbohydrate_grams', 10, 2)->nullable();
            $table->decimal('fat_grams', 10, 2)->nullable();
            $table->json('micronutrients')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'name']);
        });

        Schema::create('nutrition_ingredients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('default_unit', 32);
            $table->timestamps();
            $table->unique(['owner_id', 'name']);
        });

        Schema::create('nutrition_recipe_ingredients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('recipe_id')->constrained('nutrition_recipes')->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('nutrition_ingredients')->cascadeOnDelete();
            $table->decimal('quantity', 12, 4);
            $table->string('unit', 32);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->unique(['recipe_id', 'ingredient_id']);
        });

        Schema::create('nutrition_meals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipe_id')->nullable()->constrained('nutrition_recipes')->nullOnDelete();
            $table->string('name', 160);
            $table->string('meal_type', 32);
            $table->timestamp('eaten_at');
            $table->decimal('servings', 8, 2)->default(1);
            $table->decimal('calories', 10, 2)->nullable();
            $table->decimal('protein_grams', 10, 2)->nullable();
            $table->decimal('carbohydrate_grams', 10, 2)->nullable();
            $table->decimal('fat_grams', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'eaten_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_meals');
        Schema::dropIfExists('nutrition_recipe_ingredients');
        Schema::dropIfExists('nutrition_ingredients');
        Schema::dropIfExists('nutrition_recipes');
    }
};
