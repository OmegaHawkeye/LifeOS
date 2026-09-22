<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 120);
            $table->string('domain', 24);
            $table->string('frequency', 16);
            $table->json('days_of_week')->nullable();
            $table->time('reminder_time')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['owner_id', 'is_active']);
        });

        Schema::create('routine_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('routine_id')->constrained('routines')->cascadeOnDelete();
            $table->date('occurrence_on');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('snoozed_until')->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'routine_id', 'occurrence_on']);
            $table->index(['owner_id', 'completed_at']);
        });

        Schema::create('weekly_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->date('week_start');
            $table->text('notes')->nullable();
            $table->text('next_week_focus')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_reviews');
        Schema::dropIfExists('routine_logs');
        Schema::dropIfExists('routines');
    }
};
