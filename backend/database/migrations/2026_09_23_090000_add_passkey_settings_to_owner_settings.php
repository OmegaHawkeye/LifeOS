<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('owner_settings', function (Blueprint $table): void {
            $table->boolean('passkeys_enabled')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('owner_settings', function (Blueprint $table): void {
            $table->dropColumn('passkeys_enabled');
        });
    }
};
