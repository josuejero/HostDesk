<?php

declare(strict_types=1);

namespace HostDesk\Api;

use PDO;
use PDOException;

final class Db
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
        $port = $_ENV['DB_PORT'] ?? '3306';
        $name = $_ENV['DB_NAME'] ?? 'hostdesk';
        $user = $_ENV['DB_USER'] ?? 'hostdesk';
        $password = $_ENV['DB_PASSWORD'] ?? 'hostdesk';

        try {
            self::$connection = new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name),
                $user,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ],
            );
        } catch (PDOException) {
            throw new ApiException('db_connection_failed', 'Unable to connect to the HostDesk database.', 500);
        }

        return self::$connection;
    }
}
