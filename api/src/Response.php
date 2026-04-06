<?php

declare(strict_types=1);

namespace HostDesk\Api;

final class Response
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function json(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * @param mixed $data
     */
    public static function success(mixed $data, int $status = 200): never
    {
        self::json([
            'ok' => true,
            'data' => $data,
        ], $status);
    }

    /**
     * @param array<string, string> $fieldErrors
     */
    public static function error(string $code, string $message, int $status = 400, array $fieldErrors = []): never
    {
        self::json([
            'ok' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'fieldErrors' => (object) $fieldErrors,
            ],
        ], $status);
    }
}
