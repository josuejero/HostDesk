<?php

declare(strict_types=1);

use HostDesk\Api\ApiException;
use HostDesk\Api\Request;
use HostDesk\Api\Response;

$app = require dirname(__DIR__) . '/src/bootstrap.php';

$routeFiles = [
    dirname(__DIR__) . '/src/routes/health.php',
    dirname(__DIR__) . '/src/routes/auth.php',
    dirname(__DIR__) . '/src/routes/prospects.php',
    dirname(__DIR__) . '/src/routes/metrics.php',
];

$routes = [];
foreach ($routeFiles as $file) {
    $loaded = require $file;
    if (is_array($loaded)) {
        $routes = array_merge($routes, $loaded);
    }
}

try {
    $method = Request::method();
    $path = Request::path();

    foreach ($routes as $route) {
        if (($route['method'] ?? 'GET') !== $method) {
            continue;
        }

        $pattern = $route['pattern'] ?? null;
        if (!is_string($pattern) || preg_match($pattern, $path, $matches) !== 1) {
            continue;
        }

        $params = array_filter(
            $matches,
            static fn (string|int $key): bool => is_string($key),
            ARRAY_FILTER_USE_KEY,
        );

        $handler = $route['handler'] ?? null;
        if (!is_callable($handler)) {
            throw new ApiException('route_invalid', 'Route handler is not callable.', 500);
        }

        $data = $handler($app, $params);
        Response::success($data);
    }

    Response::error('not_found', 'Route not found.', 404);
} catch (ApiException $exception) {
    Response::error(
        $exception->getErrorCode(),
        $exception->getMessage(),
        $exception->getStatusCode(),
        $exception->getFieldErrors(),
    );
} catch (Throwable) {
    Response::error('server_error', 'An unexpected server error occurred.', 500);
}
