<?php

namespace App\Modules\Fitness\Application;

use App\Modules\Fitness\Models\FitnessBodyMetric;
use App\Modules\Fitness\Models\FitnessExercise;
use App\Modules\Fitness\Models\FitnessGoal;
use App\Modules\Fitness\Models\FitnessMonthlyReview;
use App\Modules\Fitness\Models\FitnessProgressPhoto;
use App\Modules\Fitness\Models\FitnessWorkoutSession;
use App\Modules\Fitness\Models\FitnessWorkoutTemplate;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class ExportFitnessData
{
    /**
     * @return array{
     *     data: array<string, array<int, array<string, mixed>>>,
     *     files: array<string, string>
     * }
     */
    public function forOwner(int|string $ownerId): array
    {
        $photos = FitnessProgressPhoto::query()
            ->where('owner_id', $ownerId)
            ->orderBy('id')
            ->get();
        $mediaFiles = [];
        $photoData = [];
        $disk = Storage::disk('fitness-private');
        $ownerPhotoPrefix = "owners/{$ownerId}/progress-photos/";

        foreach ($photos as $photo) {
            if (! str_starts_with($photo->storage_path, $ownerPhotoPrefix)) {
                throw new RuntimeException('A progress photo is stored outside its owner directory.');
            }

            $relativePath = substr($photo->storage_path, strlen($ownerPhotoPrefix));
            if ($relativePath === '' || str_contains($relativePath, '/') || str_contains($relativePath, '..')) {
                throw new RuntimeException('A progress photo has an invalid storage path.');
            }

            $extension = strtolower(pathinfo($photo->storage_path, PATHINFO_EXTENSION));
            if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                throw new RuntimeException('A progress photo has an unsupported file extension.');
            }

            if (! $disk->exists($photo->storage_path)) {
                throw new RuntimeException('A progress photo file is missing.');
            }

            $archivePath = "files/progress-photos/{$photo->id}.{$extension}";
            $contents = $disk->get($photo->storage_path);
            if (! is_string($contents)) {
                throw new RuntimeException('A progress photo file could not be read.');
            }

            $mediaFiles[$archivePath] = $contents;
            $attributes = $photo->toArray();
            unset($attributes['storage_path']);
            $attributes['file_archive_path'] = $archivePath;
            $photoData[] = $attributes;
        }

        return [
            'data' => [
                'body_metrics' => FitnessBodyMetric::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
                'goals' => FitnessGoal::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
                'exercises' => FitnessExercise::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
                'workout_templates' => FitnessWorkoutTemplate::query()
                    ->where('owner_id', $ownerId)
                    ->with('exercises')
                    ->orderBy('id')
                    ->get()
                    ->toArray(),
                'workout_sessions' => FitnessWorkoutSession::query()
                    ->where('owner_id', $ownerId)
                    ->with('exercises.sets')
                    ->orderBy('id')
                    ->get()
                    ->toArray(),
                'progress_photos' => $photoData,
                'monthly_reviews' => FitnessMonthlyReview::query()->where('owner_id', $ownerId)->orderBy('id')->get()->toArray(),
            ],
            'files' => $mediaFiles,
        ];
    }
}
