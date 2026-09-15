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
        Schema::create('health_sources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('key', 80);
            $table->string('name', 120);
            $table->string('kind', 32);
            $table->json('metadata')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'key']);
        });
        Schema::create('health_sync_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('health_sources')->cascadeOnDelete();
            $table->string('status', 24)->default('running');
            $table->string('cursor', 255)->nullable();
            $table->unsignedInteger('imported_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->json('error_summary')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'status', 'started_at']);
        });
        Schema::create('health_samples', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('health_sources')->cascadeOnDelete();
            $table->foreignId('sync_run_id')->nullable()->constrained('health_sync_runs')->nullOnDelete();
            $table->string('external_id', 255)->nullable();
            $table->string('sample_type', 40);
            $table->decimal('value', 19, 4);
            $table->string('unit', 32);
            $table->timestamp('recorded_at');
            $table->timestamp('ended_at')->nullable();
            $table->decimal('confidence', 5, 4)->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_manual')->default(false);
            $table->string('conflict_status', 24)->default('accepted');
            $table->timestamps();
            $table->unique(['owner_id', 'source_id', 'external_id']);
            $table->index(['owner_id', 'sample_type', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('health_samples');
        Schema::dropIfExists('health_sync_runs');
        Schema::dropIfExists('health_sources');
    }
};
