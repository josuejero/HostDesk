<?php

declare(strict_types=1);

return [
    [
        'method' => 'GET',
        'pattern' => '#^/api/health$#',
        'handler' => static function (array $app): array {
            $statement = $app['db']->query('SELECT 1');
            return [
                'status' => 'ok',
                'database' => $statement !== false ? 'up' : 'unknown',
                'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ATOM),
            ];
        },
    ],
];
