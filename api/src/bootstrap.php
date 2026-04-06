<?php

declare(strict_types=1);

use HostDesk\Api\Db;
use HostDesk\Api\Repositories\LoginAttemptRepository;
use HostDesk\Api\Repositories\MetricsRepository;
use HostDesk\Api\Repositories\ProspectRepository;
use HostDesk\Api\Repositories\UserRepository;
use HostDesk\Api\Services\AuthService;
use HostDesk\Api\Services\ProspectSeederService;
use HostDesk\Api\Services\ProspectService;
use HostDesk\Api\Services\StageRulesService;

$projectRoot = dirname(__DIR__, 2);

$loadEnv = static function (string $path): void {
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $trimmed, 2);
        $key = trim($key);
        $value = trim($value);
        $value = trim($value, "\"'");

        if ($key === '') {
            continue;
        }

        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv(sprintf('%s=%s', $key, $value));
    }
};

$loadEnv($projectRoot . '/.env');

date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'UTC');
error_reporting(E_ALL);
ini_set('display_errors', ($_ENV['APP_DEBUG'] ?? '0') === '1' ? '1' : '0');

$patterns = [
    __DIR__ . '/*.php',
    __DIR__ . '/repositories/*.php',
    __DIR__ . '/services/*.php',
];

foreach ($patterns as $pattern) {
    foreach (glob($pattern) ?: [] as $file) {
        if (basename($file) === 'bootstrap.php') {
            continue;
        }
        require_once $file;
    }
}

session_name($_ENV['SESSION_NAME'] ?? 'hostdesk_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => ($_ENV['SESSION_COOKIE_SECURE'] ?? '0') === '1',
    'httponly' => true,
    'samesite' => $_ENV['SESSION_COOKIE_SAMESITE'] ?? 'Lax',
]);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$db = Db::connection();
$userRepository = new UserRepository($db);
$loginAttemptRepository = new LoginAttemptRepository($db);
$prospectRepository = new ProspectRepository($db);
$metricsRepository = new MetricsRepository($db);
$stageRulesService = new StageRulesService(new DateTimeZone($_ENV['APP_TIMEZONE'] ?? 'UTC'));
$prospectSeederService = new ProspectSeederService($db, $projectRoot . '/data/scenario-catalog.json');
$authService = new AuthService($userRepository, $loginAttemptRepository, $prospectSeederService);
$prospectService = new ProspectService(
    $db,
    $prospectRepository,
    $metricsRepository,
    $stageRulesService,
    $prospectSeederService,
    $userRepository,
);

return [
    'root' => $projectRoot,
    'db' => $db,
    'userRepository' => $userRepository,
    'loginAttemptRepository' => $loginAttemptRepository,
    'prospectRepository' => $prospectRepository,
    'metricsRepository' => $metricsRepository,
    'stageRulesService' => $stageRulesService,
    'prospectSeederService' => $prospectSeederService,
    'authService' => $authService,
    'prospectService' => $prospectService,
];
