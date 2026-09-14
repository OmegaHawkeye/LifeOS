<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceTransactions;
use App\Modules\Finance\Http\Requests\StoreFinanceTransactionRequest;
use App\Modules\Finance\Http\Resources\FinanceTransactionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceTransactionController
{
    public function __construct(private readonly ManageFinanceTransactions $transactions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceTransactionResource::collection(
            $this->transactions->forOwner($request->user()->getAuthIdentifier()),
        );
    }

    public function store(StoreFinanceTransactionRequest $request): JsonResponse
    {
        $transaction = $this->transactions->create(
            $request->user()->getAuthIdentifier(),
            $request->validated(),
        );

        return (new FinanceTransactionResource($transaction))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
