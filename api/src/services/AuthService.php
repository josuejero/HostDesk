<?php

declare(strict_types=1);

namespace HostDesk\Api\Services;

use HostDesk\Api\ApiException;
use HostDesk\Api\Auth;
use HostDesk\Api\Csrf;
use HostDesk\Api\Repositories\LoginAttemptRepository;
use HostDesk\Api\Repositories\UserRepository;

final class AuthService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly LoginAttemptRepository $loginAttemptRepository,
        private readonly ProspectSeederService $prospectSeederService,
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function register(array $payload, string $ipAddress): array
    {
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $displayName = trim((string) ($payload['displayName'] ?? ''));

        $fieldErrors = [];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $fieldErrors['email'] = 'Enter a valid email address.';
        }
        if (strlen($password) < 8) {
            $fieldErrors['password'] = 'Use at least 8 characters.';
        }
        if ($displayName === '') {
            $fieldErrors['displayName'] = 'Display name is required.';
        }
        if ($fieldErrors !== []) {
            throw new ApiException('validation_failed', 'Registration details are incomplete.', 422, $fieldErrors);
        }

        if ($this->userRepository->findByEmail($email) !== null) {
            throw new ApiException('email_taken', 'An account with that email already exists.', 409, [
                'email' => 'That email is already registered.',
            ]);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $userId = $this->userRepository->create($email, $passwordHash, $displayName);
        $this->prospectSeederService->resetForUser($userId);

        Auth::login($userId);
        $this->userRepository->updateLastLogin($userId);
        $this->loginAttemptRepository->clearFailures($email, $ipAddress);

        return $this->session();
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function login(array $payload, string $ipAddress): array
    {
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            throw new ApiException('validation_failed', 'Email and password are required.', 422, [
                'email' => 'Email is required.',
                'password' => 'Password is required.',
            ]);
        }

        $failures = $this->loginAttemptRepository->countRecentFailures($email, $ipAddress);
        if ($failures >= 5) {
            throw new ApiException('login_locked', 'Too many failed login attempts. Try again in 15 minutes.', 429);
        }

        $user = $this->userRepository->findByEmail($email);
        if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
            $this->loginAttemptRepository->recordFailure($email, $ipAddress);
            throw new ApiException('invalid_credentials', 'Email or password is incorrect.', 401);
        }

        $userId = (int) $user['id'];
        Auth::login($userId);
        $this->userRepository->updateLastLogin($userId);
        $this->loginAttemptRepository->clearFailures($email, $ipAddress);

        return $this->session();
    }

    /**
     * @return array<string, mixed>
     */
    public function session(): array
    {
        $userId = Auth::currentUserId();
        if ($userId === null) {
            return [
                'authenticated' => false,
                'user' => null,
                'csrfToken' => null,
            ];
        }

        $user = $this->userRepository->findById($userId);
        if ($user === null) {
            Auth::logout();
            return [
                'authenticated' => false,
                'user' => null,
                'csrfToken' => null,
            ];
        }

        return [
            'authenticated' => true,
            'user' => [
                'id' => (string) $user['id'],
                'email' => $user['email'],
                'displayName' => $user['display_name'],
                'createdAt' => (new \DateTimeImmutable((string) $user['created_at'], new \DateTimeZone('UTC')))->format(DATE_ATOM),
                'lastLoginAt' => $user['last_login_at'] !== null
                    ? (new \DateTimeImmutable((string) $user['last_login_at'], new \DateTimeZone('UTC')))->format(DATE_ATOM)
                    : null,
            ],
            'csrfToken' => Csrf::token(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function logout(): array
    {
        Auth::logout();
        return [
            'authenticated' => false,
            'user' => null,
            'csrfToken' => null,
        ];
    }
}
