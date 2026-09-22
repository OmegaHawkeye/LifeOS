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
        Schema::create('fitness_exercises', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('muscle_group', 60)->nullable();
            $table->string('equipment', 60)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'name']);
        });

        Schema::create('fitness_workout_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->json('scheduled_days')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'name']);
        });

        Schema::create('fitness_workout_template_exercises', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('template_id')->constrained('fitness_workout_templates')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('fitness_exercises')->restrictOnDelete();
            $table->unsignedSmallInteger('position');
            $table->unsignedTinyInteger('target_sets')->nullable();
            $table->string('target_reps', 20)->nullable();
            $table->decimal('target_weight', 10, 2)->nullable();
            $table->string('target_weight_unit', 8)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['template_id', 'position']);
        });

        Schema::create('fitness_workout_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('fitness_workout_templates')->nullOnDelete();
            $table->string('name', 100);
            $table->string('status', 24)->default('in_progress');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'status', 'started_at']);
        });

        Schema::create('fitness_workout_session_exercises', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('session_id')->constrained('fitness_workout_sessions')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('fitness_exercises')->restrictOnDelete();
            $table->string('exercise_name', 100);
            $table->unsignedSmallInteger('position');
            $table->unsignedTinyInteger('target_sets')->nullable();
            $table->string('target_reps', 20)->nullable();
            $table->decimal('target_weight', 10, 2)->nullable();
            $table->string('target_weight_unit', 8)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['session_id', 'position']);
        });

        Schema::create('fitness_workout_sets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('session_exercise_id')->constrained('fitness_workout_session_exercises')->cascadeOnDelete();
            $table->unsignedSmallInteger('set_number');
            $table->unsignedSmallInteger('reps')->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->string('weight_unit', 8)->nullable();
            $table->decimal('rpe', 3, 1)->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['session_exercise_id', 'set_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fitness_workout_sets');
        Schema::dropIfExists('fitness_workout_session_exercises');
        Schema::dropIfExists('fitness_workout_sessions');
        Schema::dropIfExists('fitness_workout_template_exercises');
        Schema::dropIfExists('fitness_workout_templates');
        Schema::dropIfExists('fitness_exercises');
    }
};
