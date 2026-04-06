<?php

declare(strict_types=1);

namespace HostDesk\Api;

final class Request
{
    /**
     * @var array<string, mixed>|null
     */
    private static ?array $jsonBody = null;

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function path(): string
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        return is_string($path) && $path !== '' ? $path : '/';
    }

    public static function ip(): string
    {
        return trim((string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'));
    }

    /**
     * @return array<string, mixed>
     */
    public static function jsonBody(): array
    {
        if (self::$jsonBody !== null) {
            return self::$jsonBody;
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            self::$jsonBody = [];
            return self::$jsonBody;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new ApiException('invalid_json', 'Request body must be valid JSON.', 400);
        }

        self::$jsonBody = $decoded;
        return self::$jsonBody;
    }

    public static function header(string $name): ?string
    {
        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $value = $_SERVER[$serverKey] ?? null;
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}
