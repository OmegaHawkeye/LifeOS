<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceTransfers;
use App\Modules\Finance\Http\Requests\StoreFinanceTransferRequest;
use App\Modules\Finance\Http\Resources\FinanceTransferResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceTransferController
{
    public function __construct(private readonly ManageFinanceTransfers $transfers) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceTransferResource::collection(
            $this->transfers->forOwner($request->user()->getAuthIdentifier()),
        );
    }

    public function store(StoreFinanceTransferRequest $request): JsonResponse
    {
        $transfer = $this->transfers->create(
            $request->user()->getAuthIdentifier(),
            $request->validated(),
        );

        return (new FinanceTransferResource($transfer))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
