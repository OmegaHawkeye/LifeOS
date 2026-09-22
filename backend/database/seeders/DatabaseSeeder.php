<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => 'password'],
        );

        $this->call(FinanceSeeder::class);
        $this->call(FinancePlanningSeeder::class);
        $this->call(FitnessSeeder::class);
        $this->call(NutritionSeeder::class);
        $this->call(RoutinesSeeder::class);
    }
}
