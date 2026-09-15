<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('finance_budgets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('finance_categories')->restrictOnDelete();
            $table->date('month');
            $table->char('currency', 3);
            $table->decimal('target_amount', 19, 4);
            $table->timestamps();

            $table->unique(['owner_id', 'category_id', 'month', 'currency']);
            $table->index(['owner_id', 'month']);
        });

        Schema::create('finance_savings_goals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->decimal('target_amount', 19, 4);
            $table->decimal('current_amount', 19, 4)->default(0);
            $table->char('currency', 3);
            $table->date('target_date');
            $table->timestamps();

            $table->index(['owner_id', 'target_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_savings_goals');
        Schema::dropIfExists('finance_budgets');
    }
};
