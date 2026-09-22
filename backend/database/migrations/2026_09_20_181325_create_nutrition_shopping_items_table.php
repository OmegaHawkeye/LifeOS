<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_shopping_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shopping_list_id')->constrained('nutrition_shopping_lists')->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('normalized_name', 160);
            $table->decimal('quantity', 12, 4)->nullable();
            $table->string('unit', 32)->nullable();
            $table->string('store_section', 40)->default('other');
            $table->boolean('is_checked')->default(false);
            $table->boolean('is_manual')->default(false);
            $table->boolean('quantity_warning')->default(false);
            $table->timestamps();
            $table->index(['shopping_list_id', 'normalized_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_shopping_items');
    }
};
