<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fitness_body_metrics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('metric_type', 40);
            $table->decimal('value', 19, 4);
            $table->string('unit', 24);
            $table->timestamp('measured_at');
            $table->text('notes')->nullable();
            $table->string('source', 32)->default('manual');
            $table->string('external_id', 255)->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'source', 'external_id']);
            $table->index(['owner_id', 'metric_type', 'measured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fitness_body_metrics');
    }
};
