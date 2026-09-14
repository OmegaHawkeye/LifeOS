<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Finance\Models\FinancePayee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinancePayee>
 */
class FinancePayeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'owner_id' => User::factory(),
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
            'is_archived' => false,
        ];
    }
}
