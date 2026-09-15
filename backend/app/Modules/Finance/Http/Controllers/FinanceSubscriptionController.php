<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceSubscriptions;
use App\Modules\Finance\Http\Requests\StoreFinanceSubscriptionRequest;
use App\Modules\Finance\Http\Requests\UpdateFinanceSubscriptionRequest;
use App\Modules\Finance\Http\Resources\FinanceSubscriptionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceSubscriptionController
{
    public function __construct(private readonly ManageFinanceSubscriptions $subscriptions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceSubscriptionResource::collection(
            $this->subscriptions->forOwner($request->user()->getAuthIdentifier()),
        );
    }

    public function store(StoreFinanceSubscriptionRequest $request): JsonResponse
    {
        $subscription = $this->subscriptions->create(
            $request->user()->getAuthIdentifier(),
            $request->validated(),
        );

        return (new FinanceSubscriptionResource($subscription))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateFinanceSubscriptionRequest $request, int $subscription): FinanceSubscriptionResource
    {
        return new FinanceSubscriptionResource($this->subscriptions->update(
            $request->user()->getAuthIdentifier(),
            $subscription,
            $request->validated(),
        ));
    }
}
