<?php

declare(strict_types=1);

namespace HostDesk\Api;

final class Auth
{
    public static function currentUserId(): ?int
    {
        $userId = $_SESSION['user_id'] ?? null;
        return is_int($userId) ? $userId : null;
    }

    public static function requireUserId(): int
    {
        $userId = self::currentUserId();
        if ($userId === null) {
            throw new ApiException('auth_required', 'You must be signed in to access HostDesk.', 401);
        }

        $_SESSION['last_seen_at'] = gmdate('c');
        return $userId;
    }

    public static function login(int $userId): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['authenticated_at'] = gmdate('c');
        $_SESSION['last_seen_at'] = gmdate('c');
        Csrf::refreshToken();
    }

    public static function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                [
                    'expires' => time() - 42000,
                    'path' => $params['path'] ?? '/',
                    'domain' => $params['domain'] ?? '',
                    'secure' => (bool) ($params['secure'] ?? false),
                    'httponly' => (bool) ($params['httponly'] ?? true),
                    'samesite' => $params['samesite'] ?? 'Lax',
                ],
            );
        }

        session_destroy();
    }

    public static function requireCsrf(): void
    {
        $method = Request::method();
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        if (!Csrf::validate(Request::header('X-CSRF-Token'))) {
            throw new ApiException('csrf_invalid', 'A valid CSRF token is required for this request.', 403);
        }
    }
}
