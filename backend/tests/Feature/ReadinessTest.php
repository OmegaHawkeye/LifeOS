<?php

namespace Tests\Feature;

use Tests\TestCase;

class ReadinessTest extends TestCase
{
    public function test_api_reports_that_it_is_ready(): void
    {
        $response = $this->getJson('/api/v1/readiness');

        $response
            ->assertOk()
            ->assertExactJson([
                'service' => 'lifeos-api',
                'status' => 'ok',
            ]);
    }
}
