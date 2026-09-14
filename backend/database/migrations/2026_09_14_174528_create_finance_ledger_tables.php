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
        Schema::create('finance_payees', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('normalized_name', 120);
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            $table->unique(['owner_id', 'normalized_name']);
        });

        Schema::create('finance_tags', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 50);
            $table->string('normalized_name', 50);
            $table->char('color', 7)->nullable();
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            $table->unique(['owner_id', 'normalized_name']);
        });

        Schema::create('finance_transfers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('from_account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->foreignId('to_account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->decimal('from_amount', 19, 4);
            $table->char('from_currency', 3);
            $table->decimal('to_amount', 19, 4);
            $table->char('to_currency', 3);
            $table->string('description', 255)->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['owner_id', 'occurred_at']);
        });

        Schema::create('finance_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('finance_categories')->restrictOnDelete();
            $table->foreignId('payee_id')->nullable()->constrained('finance_payees')->restrictOnDelete();
            $table->string('type', 16);
            $table->decimal('amount', 19, 4);
            $table->char('currency', 3);
            $table->string('description', 255)->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['owner_id', 'occurred_at']);
            $table->index(['account_id', 'occurred_at']);
            $table->index(['category_id', 'occurred_at']);
        });

        Schema::create('finance_transaction_tags', function (Blueprint $table): void {
            $table->foreignId('transaction_id')->constrained('finance_transactions')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('finance_tags')->restrictOnDelete();

            $table->primary(['transaction_id', 'tag_id']);
        });

        Schema::create('finance_recurring_patterns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('finance_categories')->restrictOnDelete();
            $table->foreignId('payee_id')->nullable()->constrained('finance_payees')->restrictOnDelete();
            $table->string('type', 16);
            $table->decimal('amount', 19, 4);
            $table->char('currency', 3);
            $table->string('frequency', 16);
            $table->unsignedSmallInteger('interval')->default(1);
            $table->date('starts_on');
            $table->date('next_occurrence_on');
            $table->date('ends_on')->nullable();
            $table->string('description', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['owner_id', 'is_active', 'next_occurrence_on']);
        });

        Schema::create('finance_import_references', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('transaction_id')->unique()->constrained('finance_transactions')->cascadeOnDelete();
            $table->string('provider', 80);
            $table->string('external_id', 255);
            $table->json('raw_metadata')->nullable();
            $table->timestamp('imported_at');
            $table->timestamps();

            $table->unique(['owner_id', 'provider', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_import_references');
        Schema::dropIfExists('finance_recurring_patterns');
        Schema::dropIfExists('finance_transaction_tags');
        Schema::dropIfExists('finance_transactions');
        Schema::dropIfExists('finance_transfers');
        Schema::dropIfExists('finance_tags');
        Schema::dropIfExists('finance_payees');
    }
};
