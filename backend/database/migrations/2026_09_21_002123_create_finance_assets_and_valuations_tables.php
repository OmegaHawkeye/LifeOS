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
        Schema::create('finance_assets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->string('name', 120);
            $table->string('asset_type', 32);
            $table->char('currency', 3);
            $table->decimal('cost_basis', 19, 4)->nullable();
            $table->decimal('current_value', 19, 4)->nullable();
            $table->date('current_valued_at')->nullable();
            $table->string('current_source', 16)->nullable();
            $table->boolean('include_in_net_worth')->default(true);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'archived_at', 'include_in_net_worth']);
            $table->index(['account_id', 'archived_at']);
        });

        Schema::create('finance_asset_valuations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('asset_id')->constrained('finance_assets')->cascadeOnDelete();
            $table->decimal('value', 19, 4);
            $table->date('valued_at');
            $table->string('source', 16)->default('manual');
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->index(['asset_id', 'valued_at', 'id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_asset_valuations');
        Schema::dropIfExists('finance_assets');
    }
};
