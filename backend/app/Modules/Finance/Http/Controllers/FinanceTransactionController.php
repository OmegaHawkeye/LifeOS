<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceTransactions;
use App\Modules\Finance\Http\Requests\ListFinanceTransactionsRequest;
use App\Modules\Finance\Http\Requests\StoreFinanceTransactionRequest;
use App\Modules\Finance\Http\Requests\UpdateFinanceTransactionRequest;
use App\Modules\Finance\Http\Resources\FinanceTransactionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceTransactionController
{
    public function __construct(private readonly ManageFinanceTransactions $transactions) {}

    public function index(ListFinanceTransactionsRequest $request): AnonymousResourceCollection
    {
        return FinanceTransactionResource::collection(
            $this->transactions->forOwner($request->user()->getAuthIdentifier(), $request->validated()),
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

    public function update(UpdateFinanceTransactionRequest $request, int $transaction): FinanceTransactionResource
    {
        return new FinanceTransactionResource($this->transactions->update(
            $request->user()->getAuthIdentifier(),
            $transaction,
            $request->validated(),
        ));
    }

    public function destroy(Request $request, int $transaction): Response
    {
        $this->transactions->delete($request->user()->getAuthIdentifier(), $transaction);

        return response()->noContent();
    }
}
