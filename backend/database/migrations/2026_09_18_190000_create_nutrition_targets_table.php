<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_targets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('calories', 8, 2)->nullable();
            $table->decimal('protein_grams', 8, 2)->nullable();
            $table->decimal('carbohydrate_grams', 8, 2)->nullable();
            $table->decimal('fat_grams', 8, 2)->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();
            $table->unique('owner_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_targets');
    }
};
