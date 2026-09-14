<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceCategories;
use App\Modules\Finance\Http\Requests\StoreFinanceCategoryRequest;
use App\Modules\Finance\Http\Requests\UpdateFinanceCategoryRequest;
use App\Modules\Finance\Http\Resources\FinanceCategoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceCategoryController
{
    public function __construct(private readonly ManageFinanceCategories $categories) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceCategoryResource::collection(
            $this->categories->forOwner($request->user()->getAuthIdentifier()),
        );
    }

    public function store(StoreFinanceCategoryRequest $request): JsonResponse
    {
        $category = $this->categories->create(
            $request->user()->getAuthIdentifier(),
            $request->validated(),
        );

        return (new FinanceCategoryResource($category))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateFinanceCategoryRequest $request, int $category): FinanceCategoryResource
    {
        return new FinanceCategoryResource($this->categories->update(
            $request->user()->getAuthIdentifier(),
            $category,
            $request->validated(),
        ));
    }
}
