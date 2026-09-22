<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_plan_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipe_id')->nullable()->constrained('nutrition_recipes')->nullOnDelete();
            $table->string('recipe_name', 160);
            $table->date('plan_date');
            $table->string('meal_slot', 32);
            $table->decimal('servings', 8, 2)->default(1);
            $table->string('status', 24)->default('planned');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'plan_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_plan_items');
    }
};
