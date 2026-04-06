<?php

declare(strict_types=1);

namespace HostDesk\Api\Repositories;

use PDO;

final class LoginAttemptRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function countRecentFailures(string $email, string $ipAddress, int $windowMinutes = 15): int
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*) AS failures
             FROM login_attempts
             WHERE attempted_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL :windowMinutes MINUTE)
               AND (email = :email OR ip_address = :ipAddress)',
        );
        $statement->bindValue(':windowMinutes', $windowMinutes, PDO::PARAM_INT);
        $statement->bindValue(':email', $email);
        $statement->bindValue(':ipAddress', $ipAddress);
        $statement->execute();

        return (int) ($statement->fetchColumn() ?: 0);
    }

    public function recordFailure(string $email, string $ipAddress): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO login_attempts (email, ip_address)
             VALUES (:email, :ipAddress)',
        );
        $statement->execute([
            'email' => $email,
            'ipAddress' => $ipAddress,
        ]);
    }

    public function clearFailures(string $email, string $ipAddress): void
    {
        $statement = $this->db->prepare(
            'DELETE FROM login_attempts
             WHERE email = :email OR ip_address = :ipAddress',
        );
        $statement->execute([
            'email' => $email,
            'ipAddress' => $ipAddress,
        ]);
    }
}
