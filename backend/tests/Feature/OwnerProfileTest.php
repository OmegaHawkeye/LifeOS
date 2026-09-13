<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerProfileTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_returns_401_when_owner_is_not_authenticated(): void
    {
        $response = $this->getJson('/api/v1/me');

        $response->assertUnauthorized();
    }

    public function test_returns_authenticated_owner_profile(): void
    {
        $owner = User::factory()->create([
            'email' => 'julian@example.test',
            'name' => 'Julian',
        ]);
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/me');

        $response
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'email' => 'julian@example.test',
                    'id' => $owner->id,
                    'name' => 'Julian',
                ],
            ]);
    }
}
