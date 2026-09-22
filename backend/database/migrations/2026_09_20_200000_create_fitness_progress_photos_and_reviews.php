<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fitness_progress_photos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('body_metric_id')->nullable()->constrained('fitness_body_metrics')->nullOnDelete();
            $table->date('photo_date');
            $table->string('angle', 16)->nullable();
            $table->json('tags');
            $table->text('notes')->nullable();
            $table->string('storage_path', 255)->unique();
            $table->string('mime_type', 64);
            $table->unsignedInteger('file_size');
            $table->timestamps();
            $table->index(['owner_id', 'photo_date']);
        });

        Schema::create('fitness_monthly_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->date('review_month');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['owner_id', 'review_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fitness_monthly_reviews');
        Schema::dropIfExists('fitness_progress_photos');
    }
};
