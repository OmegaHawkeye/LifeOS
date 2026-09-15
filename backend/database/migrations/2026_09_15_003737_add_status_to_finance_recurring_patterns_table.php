<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('finance_recurring_patterns', function (Blueprint $table): void {
            $table->string('status', 16)->default('active');
        });

        DB::table('finance_recurring_patterns')
            ->where('is_active', false)
            ->update(['status' => 'paused']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_recurring_patterns', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }
};
