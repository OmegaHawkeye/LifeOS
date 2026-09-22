<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceAssets;
use App\Modules\Finance\Http\Requests\StoreFinanceAssetRequest;
use App\Modules\Finance\Http\Requests\StoreFinanceAssetValuationRequest;
use App\Modules\Finance\Http\Requests\UpdateFinanceAssetRequest;
use App\Modules\Finance\Http\Resources\FinanceAssetResource;
use App\Modules\Finance\Http\Resources\FinanceAssetValuationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceAssetController
{
    public function __construct(private readonly ManageFinanceAssets $assets) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceAssetResource::collection($this->assets->forOwner($request->user()->getAuthIdentifier()));
    }

    public function store(StoreFinanceAssetRequest $request): JsonResponse
    {
        $asset = $this->assets->create($request->user()->getAuthIdentifier(), $request->validated());

        return (new FinanceAssetResource($asset))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateFinanceAssetRequest $request, int $asset): FinanceAssetResource
    {
        return new FinanceAssetResource($this->assets->update(
            $request->user()->getAuthIdentifier(),
            $asset,
            $request->validated(),
        ));
    }

    public function valuations(Request $request, int $asset): AnonymousResourceCollection
    {
        return FinanceAssetValuationResource::collection(
            $this->assets->valuationsForOwner($request->user()->getAuthIdentifier(), $asset),
        );
    }

    public function storeValuation(StoreFinanceAssetValuationRequest $request, int $asset): JsonResponse
    {
        $attributes = $request->validated();
        $valuation = $this->assets->addValuation(
            $request->user()->getAuthIdentifier(),
            $asset,
            $attributes['value'],
            $attributes['valued_at'],
            $attributes['notes'] ?? null,
        );

        return (new FinanceAssetValuationResource($valuation))->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
