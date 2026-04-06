<?php

declare(strict_types=1);

namespace HostDesk\Api;

use RuntimeException;

final class ApiException extends RuntimeException
{
    /**
     * @param array<string, string> $fieldErrors
     */
    public function __construct(
        private readonly string $errorCode,
        string $message,
        private readonly int $statusCode = 400,
        private readonly array $fieldErrors = [],
    ) {
        parent::__construct($message);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * @return array<string, string>
     */
    public function getFieldErrors(): array
    {
        return $this->fieldErrors;
    }
}
