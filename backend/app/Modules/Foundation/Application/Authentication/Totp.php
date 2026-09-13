<?php

namespace App\Modules\Foundation\Application\Authentication;

class Totp
{
    public static function generateSecret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    public static function verify(string $secret, string $code, int $timestamp): bool
    {
        if (! preg_match('/^\d{6}$/D', $code)) {
            return false;
        }

        $key = self::base32Decode($secret);

        if ($key === null) {
            return false;
        }

        $counter = intdiv($timestamp, 30);

        foreach ([-1, 0, 1] as $window) {
            if ($counter + $window < 0) {
                continue;
            }

            if (hash_equals(self::codeForKey($key, $counter + $window), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function codeFor(string $secret, int $timestamp): string
    {
        $key = self::base32Decode($secret);

        if ($key === null) {
            throw new \InvalidArgumentException('The TOTP secret is not valid Base32.');
        }

        return self::codeForKey($key, intdiv($timestamp, 30));
    }

    private static function codeForKey(string $key, int $counter): string
    {
        $message = pack('N2', ($counter >> 32) & 0xFFFFFFFF, $counter & 0xFFFFFFFF);
        $digest = hash_hmac('sha1', $message, $key, true);
        $offset = ord($digest[strlen($digest) - 1]) & 0x0F;
        $value = unpack('N', substr($digest, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($value % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    private static function base32Encode(string $value): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';

        foreach (str_split($value) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';

        foreach (str_split($bits, 5) as $chunk) {
            if (strlen($chunk) < 5) {
                $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            }

            $encoded .= $alphabet[bindec($chunk)];
        }

        return $encoded;
    }

    private static function base32Decode(string $value): ?string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $normalized = strtoupper(rtrim($value, '='));
        $bits = '';

        foreach (str_split($normalized) as $character) {
            $index = strpos($alphabet, $character);

            if ($index === false) {
                return null;
            }

            $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }

        $decoded = '';

        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $decoded .= chr(bindec($chunk));
            }
        }

        return $decoded === '' ? null : $decoded;
    }
}
