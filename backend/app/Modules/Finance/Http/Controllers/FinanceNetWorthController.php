<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\GetFinanceNetWorth;
use App\Modules\Finance\Http\Resources\FinanceNetWorthResource;
use Illuminate\Http\Request;

class FinanceNetWorthController
{
    public function show(Request $request, GetFinanceNetWorth $netWorth): FinanceNetWorthResource
    {
        return new FinanceNetWorthResource($netWorth->forOwner($request->user()->getAuthIdentifier()));
    }
}
