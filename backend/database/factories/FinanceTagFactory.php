<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinanceTag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceTag>
 */
class FinanceTagFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'owner_id' => User::factory(),
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
            'color' => '#10B981',
            'is_archived' => false,
        ];
    }
}
