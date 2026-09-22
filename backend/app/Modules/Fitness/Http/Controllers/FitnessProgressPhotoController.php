<?php

namespace App\Modules\Fitness\Http\Controllers;

use App\Modules\Fitness\Http\Resources\FitnessMonthlyReviewResource;
use App\Modules\Fitness\Http\Resources\FitnessProgressPhotoResource;
use App\Modules\Fitness\Models\FitnessMonthlyReview;
use App\Modules\Fitness\Models\FitnessProgressPhoto;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class FitnessProgressPhotoController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return FitnessProgressPhotoResource::collection(
            FitnessProgressPhoto::query()
                ->where('owner_id', $request->user()->getAuthIdentifier())
                ->with('bodyMetric')
                ->orderByDesc('photo_date')
                ->orderByDesc('id')
                ->limit(100)
                ->get(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $ownerId = $request->user()->getAuthIdentifier();
        $data = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'photo_date' => ['required', 'date_format:Y-m-d'],
            'angle' => ['sometimes', 'nullable', Rule::in(['front', 'side', 'back', 'other'])],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['string', 'max:30', 'distinct'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'body_metric_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('fitness_body_metrics', 'id')->where('owner_id', $ownerId),
            ],
        ]);

        $image = $request->file('photo');
        $path = $image->storeAs(
            "owners/{$ownerId}/progress-photos",
            Str::uuid()->toString().'.'.$image->extension(),
            'fitness-private',
        );

        try {
            $photo = new FitnessProgressPhoto([
                'body_metric_id' => $data['body_metric_id'] ?? null,
                'photo_date' => $data['photo_date'],
                'angle' => $data['angle'] ?? null,
                'tags' => $data['tags'] ?? [],
                'notes' => $data['notes'] ?? null,
                'storage_path' => $path,
                'mime_type' => $image->getMimeType() ?: 'application/octet-stream',
                'file_size' => $image->getSize(),
            ]);
            $photo->owner_id = $ownerId;
            $photo->save();
            $photo->load('bodyMetric');
        } catch (Throwable $exception) {
            Storage::disk('fitness-private')->delete($path);
            throw $exception;
        }

        return (new FitnessProgressPhotoResource($photo))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function content(Request $request, int $photo): Response
    {
        $progressPhoto = $this->ownedPhoto($request, $photo);
        $disk = Storage::disk('fitness-private');
        abort_if($disk->missing($progressPhoto->storage_path), Response::HTTP_NOT_FOUND);

        return $disk->response(
            $progressPhoto->storage_path,
            "progress-photo-{$progressPhoto->getKey()}",
            [
                'Content-Type' => $progressPhoto->mime_type,
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
                'Cross-Origin-Resource-Policy' => 'same-origin',
            ],
            'inline',
        );
    }

    public function destroy(Request $request, int $photo): Response
    {
        $progressPhoto = $this->ownedPhoto($request, $photo);
        $path = $progressPhoto->storage_path;
        $disk = Storage::disk('fitness-private');
        abort_if($disk->exists($path) && ! $disk->delete($path), Response::HTTP_INTERNAL_SERVER_ERROR);
        $progressPhoto->delete();

        return response()->noContent();
    }

    public function monthlyReview(Request $request): FitnessMonthlyReviewResource
    {
        $data = $request->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $month = CarbonImmutable::parse(($data['month'] ?? now()->format('Y-m')).'-01')->startOfMonth();
        $ownerId = $request->user()->getAuthIdentifier();
        $review = FitnessMonthlyReview::query()
            ->where('owner_id', $ownerId)
            ->where('review_month', $month->toDateString())
            ->first() ?? new FitnessMonthlyReview(['review_month' => $month->toDateString()]);

        return new FitnessMonthlyReviewResource($review, $this->monthlySummary($ownerId, $month, $review));
    }

    public function completeMonthlyReview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);
        $month = CarbonImmutable::createFromFormat('!Y-m', $data['month']);
        $ownerId = $request->user()->getAuthIdentifier();
        $review = FitnessMonthlyReview::query()
            ->where('owner_id', $ownerId)
            ->firstOrNew(['review_month' => $month->toDateString()]);
        $review->owner_id = $ownerId;
        $review->reviewed_at = now();
        $review->notes = $data['notes'] ?? null;
        $review->save();

        return (new FitnessMonthlyReviewResource($review, $this->monthlySummary($ownerId, $month, $review)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    private function ownedPhoto(Request $request, int $photo): FitnessProgressPhoto
    {
        return FitnessProgressPhoto::query()
            ->where('owner_id', $request->user()->getAuthIdentifier())
            ->findOrFail($photo);
    }

    /** @return array{is_due: bool, photo_count: int, latest_photo_date: string|null} */
    private function monthlySummary(int|string $ownerId, CarbonImmutable $month, FitnessMonthlyReview $review): array
    {
        $photos = FitnessProgressPhoto::query()
            ->where('owner_id', $ownerId)
            ->whereBetween('photo_date', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()]);
        $latestPhotoDate = $photos->max('photo_date');

        return [
            'is_due' => $review->reviewed_at === null && $month->startOfMonth()->lessThanOrEqualTo(now()->startOfMonth()),
            'photo_count' => $photos->count(),
            'latest_photo_date' => $latestPhotoDate === null ? null : (string) $latestPhotoDate,
        ];
    }
}
