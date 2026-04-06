<?php

declare(strict_types=1);

use HostDesk\Api\Auth;

return [
    [
        'method' => 'GET',
        'pattern' => '#^/api/metrics$#',
        'handler' => static function (array $app): array {
            $userId = Auth::requireUserId();
            $range = $_GET['range'] ?? '30d';
            return $app['prospectService']->metrics($userId, in_array($range, ['7d', '30d'], true) ? $range : '30d');
        },
    ],
];
