<?php
declare(strict_types=1);

// Local API server only. Never serve source/configuration files from the document root.
// Apache uses .htaccess and determines SCRIPT_NAME itself in production.
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$_SERVER['SCRIPT_NAME'] = str_starts_with($uri, '/dead-cells-roulette/api/')
    ? '/dead-cells-roulette/api/index.php'
    : '/api/index.php';
require __DIR__ . '/index.php';