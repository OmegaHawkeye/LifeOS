<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Routines\Models\Routine;
use Illuminate\Database\Seeder;

class RoutinesSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::query()->where('email', 'test@example.com')->first();
        if ($owner === null) {
            return;
        }

        $routines = [
            ['title' => 'Review finance', 'domain' => 'finance', 'frequency' => 'weekly', 'days_of_week' => [1], 'reminder_time' => '09:00'],
            ['title' => 'Record weigh-in', 'domain' => 'fitness', 'frequency' => 'weekly', 'days_of_week' => [3], 'reminder_time' => '08:00'],
            ['title' => 'Plan workouts', 'domain' => 'fitness', 'frequency' => 'weekly', 'days_of_week' => [7], 'reminder_time' => '10:00'],
            ['title' => 'Prepare meals', 'domain' => 'nutrition', 'frequency' => 'weekly', 'days_of_week' => [7], 'reminder_time' => '11:00'],
            ['title' => 'Weekly review', 'domain' => 'review', 'frequency' => 'weekly', 'days_of_week' => [7], 'reminder_time' => null],
        ];

        foreach ($routines as $routine) {
            Routine::query()->firstOrCreate(
                ['owner_id' => $owner->getAuthIdentifier(), 'title' => $routine['title']],
                [...$routine, 'owner_id' => $owner->getAuthIdentifier(), 'is_active' => true],
            );
        }
    }
}
