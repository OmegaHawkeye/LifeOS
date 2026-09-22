<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mobile_login_challenges', function (Blueprint $table): void {
            $table->boolean('setup_required')->default(false)->after('attempts');
        });
    }

    public function down(): void
    {
        Schema::table('mobile_login_challenges', function (Blueprint $table): void {
            $table->dropColumn('setup_required');
        });
    }
};
