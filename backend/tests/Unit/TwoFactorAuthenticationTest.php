<?php

namespace Tests\Unit;

use App\Modules\Foundation\Application\Authentication\Totp;
use PHPUnit\Framework\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    public function test_it_verifies_the_rfc_6238_sha1_six_digit_vector(): void
    {
        $this->assertTrue(Totp::verify('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 59));
        $this->assertFalse(Totp::verify('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287083', 59));
    }

    public function test_generated_secrets_are_base32_and_verify_for_the_current_time(): void
    {
        $secret = Totp::generateSecret();

        $this->assertMatchesRegularExpression('/^[A-Z2-7]{32}$/', $secret);
        $this->assertTrue(Totp::verify($secret, Totp::codeFor($secret, 1_800_000_000), 1_800_000_000));
    }
}
