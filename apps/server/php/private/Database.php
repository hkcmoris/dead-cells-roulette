<?php
declare(strict_types=1);

namespace DeadCellsRoulette;

use PDO;
use PDOException;

require_once __DIR__ . '/Api.php';

/** @return array{DB_HOST: string, DB_PORT: int, DB_NAME: string, DB_USER: string, DB_PASS: string} */
function databaseSettings(string $configFile): array
{
    $config = is_file($configFile) ? require $configFile : [];
    if (!is_array($config)) {
        throw new HttpError(503, 'database_unavailable', 'The database configuration is invalid');
    }

    $settings = [];
    foreach (['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $key) {
        $value = getenv($key);
        $settings[$key] = $value === false ? ($config[$key] ?? '') : $value;
        if (!is_string($settings[$key])) {
            throw new HttpError(503, 'database_unavailable', 'The database configuration is invalid');
        }
    }
    foreach (['DB_HOST', 'DB_NAME', 'DB_USER'] as $key) {
        if (trim($settings[$key]) === '') {
            throw new HttpError(503, 'database_unavailable', 'The database is not configured');
        }
    }
    if (preg_match('/[;\x00-\x1f\x7f]/', $settings['DB_HOST'] . $settings['DB_NAME'])) {
        throw new HttpError(503, 'database_unavailable', 'The database configuration is invalid');
    }

    $port = $settings['DB_PORT'] === '' ? '3306' : $settings['DB_PORT'];
    if (!preg_match('/^\d+$/D', $port) || (float) $port < 1 || (float) $port > 65535) {
        throw new HttpError(503, 'database_unavailable', 'The database configuration is invalid');
    }
    $settings['DB_PORT'] = (int) $port;

    return $settings;
}

// Reserved for future data endpoints. Nothing in the current API calls this helper.
function connectDatabase(string $configFile): PDO
{
    $settings = databaseSettings($configFile);
    if (!extension_loaded('pdo_mysql')) {
        throw new HttpError(503, 'runtime_unavailable', 'The API requires pdo_mysql for database access');
    }

    try {
        return new PDO(
            'mysql:host=' . $settings['DB_HOST'] . ';port=' . $settings['DB_PORT']
                . ';dbname=' . $settings['DB_NAME'] . ';charset=utf8mb4',
            $settings['DB_USER'],
            $settings['DB_PASS'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
                PDO::ATTR_TIMEOUT => 5,
            ],
        );
    } catch (PDOException $error) {
        error_log('Dead Cells Roulette database connection failed: ' . $error->getCode());
        throw new HttpError(503, 'database_unavailable', 'The database connection is unavailable');
    }
}