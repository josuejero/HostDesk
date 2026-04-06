<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$file = $path !== false ? __DIR__ . $path : null;

if (is_string($file) && $path !== '/index.php' && $path !== '/router.php' && is_file($file)) {
    return false;
}

require __DIR__ . '/index.php';
