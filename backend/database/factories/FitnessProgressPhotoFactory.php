<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Fitness\Models\FitnessProgressPhoto;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FitnessProgressPhoto> */
class FitnessProgressPhotoFactory extends Factory
{
    protected $model = FitnessProgressPhoto::class;

    /** @return array{owner_id: int|Factory<User>, body_metric_id: null, photo_date: string, angle: string, tags: array<int, string>, notes: null, storage_path: string, mime_type: string, file_size: int} */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'body_metric_id' => null,
            'photo_date' => now()->toDateString(),
            'angle' => 'front',
            'tags' => [],
            'notes' => null,
            'storage_path' => fake()->uuid().'.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
        ];
    }
}
