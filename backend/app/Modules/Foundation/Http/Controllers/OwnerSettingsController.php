<?php

namespace App\Modules\Foundation\Http\Controllers;

use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use App\Modules\Foundation\Http\Requests\UpdateOwnerSettingsRequest;
use App\Modules\Foundation\Http\Resources\OwnerSettingsResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OwnerSettingsController
{
    public function __construct(private readonly ManageOwnerSettings $settings) {}

    public function show(Request $request): OwnerSettingsResource
    {
        return new OwnerSettingsResource($this->settings->forOwner($request->user()));
    }

    public function update(UpdateOwnerSettingsRequest $request): JsonResponse
    {
        $settings = $this->settings->update($request->user(), $request->validated());

        return (new OwnerSettingsResource($settings->refresh()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
