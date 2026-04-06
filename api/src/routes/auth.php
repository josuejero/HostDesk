<?php

declare(strict_types=1);

use HostDesk\Api\Auth;
use HostDesk\Api\Request;

return [
    [
        'method' => 'POST',
        'pattern' => '#^/api/auth/register$#',
        'handler' => static function (array $app): array {
            return $app['authService']->register(Request::jsonBody(), Request::ip());
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/auth/login$#',
        'handler' => static function (array $app): array {
            return $app['authService']->login(Request::jsonBody(), Request::ip());
        },
    ],
    [
        'method' => 'POST',
        'pattern' => '#^/api/auth/logout$#',
        'handler' => static function (array $app): array {
            Auth::requireUserId();
            Auth::requireCsrf();
            return $app['authService']->logout();
        },
    ],
    [
        'method' => 'GET',
        'pattern' => '#^/api/auth/session$#',
        'handler' => static function (array $app): array {
            return $app['authService']->session();
        },
    ],
];
