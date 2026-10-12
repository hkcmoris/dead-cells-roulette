<?php
declare(strict_types=1);

namespace DeadCellsRoulette;

use RuntimeException;

final class HttpError extends RuntimeException
{
    public function __construct(public readonly int $status, public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }
}

function requestPath(string $uri, string $scriptName): string
{
    if (preg_match('/%(?![a-f0-9]{2})/i', $uri)) {
        throw new HttpError(400, 'invalid_parameter', 'Invalid URL encoding');
    }

    $path = parse_url($uri, PHP_URL_PATH);
    $base = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
    if (!is_string($path) || !str_starts_with($path, $base . '/')) {
        throw new HttpError(404, 'not_found', 'Endpoint not found');
    }

    return rawurldecode(substr($path, strlen($base)));
}

function jsonResponse(array $body, int $status = 200): never
{
    $json = json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        echo $json;
    }
    exit;
}