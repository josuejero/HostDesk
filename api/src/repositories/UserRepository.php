<?php

declare(strict_types=1);

namespace HostDesk\Api\Repositories;

use PDO;

final class UserRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findByEmail(string $email): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, email, password_hash, display_name, created_at, last_login_at
             FROM users
             WHERE email = :email
             LIMIT 1',
        );
        $statement->execute(['email' => $email]);
        $row = $statement->fetch();
        return is_array($row) ? $row : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findById(int $userId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, email, display_name, created_at, last_login_at
             FROM users
             WHERE id = :id
             LIMIT 1',
        );
        $statement->execute(['id' => $userId]);
        $row = $statement->fetch();
        return is_array($row) ? $row : null;
    }

    public function create(string $email, string $passwordHash, string $displayName): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO users (email, password_hash, display_name)
             VALUES (:email, :passwordHash, :displayName)',
        );
        $statement->execute([
            'email' => $email,
            'passwordHash' => $passwordHash,
            'displayName' => $displayName,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function updateLastLogin(int $userId): void
    {
        $statement = $this->db->prepare(
            'UPDATE users
             SET last_login_at = CURRENT_TIMESTAMP
             WHERE id = :id',
        );
        $statement->execute(['id' => $userId]);
    }
}
