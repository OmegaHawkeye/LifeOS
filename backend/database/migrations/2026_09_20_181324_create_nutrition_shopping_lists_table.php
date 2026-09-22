<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_shopping_lists', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 160);
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedSmallInteger('unavailable_recipe_count')->default(0);
            $table->timestamps();
            $table->index(['owner_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_shopping_lists');
    }
};
