<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceAccounts;
use App\Modules\Finance\Http\Requests\StoreFinanceAccountRequest;
use App\Modules\Finance\Http\Resources\FinanceAccountResource;
use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceAccountController
{
    public function __construct(
        private readonly ManageFinanceAccounts $accounts,
        private readonly ManageOwnerSettings $ownerSettings,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceAccountResource::collection(
            $this->accounts->forOwner($request->user()->getAuthIdentifier()),
        );
    }

    public function store(StoreFinanceAccountRequest $request): JsonResponse
    {
        $account = $this->accounts->create(
            $request->user()->getAuthIdentifier(),
            $request->validated(),
            $this->ownerSettings->currencyForOwnerId($request->user()->getAuthIdentifier()),
        );

        return (new FinanceAccountResource($account))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
