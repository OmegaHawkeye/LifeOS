<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owner_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('timezone', 64)->default('Europe/Vienna');
            $table->char('currency', 3)->default('EUR');
            $table->string('measurement_system', 16)->default('metric');
            $table->string('theme', 16)->default('system');
            $table->boolean('mask_sensitive_data_by_default')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_settings');
    }
};
