<?php
declare(strict_types=1);

use DeadCellsRoulette\HttpError;

use function DeadCellsRoulette\jsonResponse;
use function DeadCellsRoulette\requestPath;

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/private/Api.php';

try {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
        header('Allow: GET, HEAD');
        throw new HttpError(405, 'method_not_allowed', 'Only GET and HEAD requests are supported');
    }

    $path = requestPath($_SERVER['REQUEST_URI'] ?? '/', $_SERVER['SCRIPT_NAME'] ?? '/api/index.php');
    if ($path === '/health') {
        // Liveness only: do not load database credentials or open a connection.
        jsonResponse(['ok' => true]);
    }

    throw new HttpError(404, 'not_found', 'Endpoint not found');
} catch (HttpError $error) {
    jsonResponse(['error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], $error->status);
} catch (Throwable $error) {
    // Keep credentials, filesystem paths, and SQL out of responses and logs.
    error_log('Dead Cells Roulette API failed: ' . get_class($error) . ' (' . $error->getCode() . ')');
    jsonResponse(['error' => ['code' => 'internal_error', 'message' => 'Internal server error']], 500);
}