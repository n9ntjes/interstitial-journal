<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_config.php';
require __DIR__ . '/_db.php';

$db_ok = false;
$db_error = null;
$db_start = microtime(true);
try {
    db()->query('SELECT 1')->fetch();
    $db_ok = true;
} catch (Throwable $e) {
    $db_error = $e->getMessage();
}
$db_latency_ms = (int) round((microtime(true) - $db_start) * 1000);

$env = ij_detect_env();
$cfg = ij_db_config();

$db_info = [
    'ok'         => $db_ok,
    'latency_ms' => $db_latency_ms,
    'driver'     => 'mysql',
    'error'      => $db_error,
];

// Only expose host/db/port when running locally — production should not
// echo infrastructure details to unauthenticated callers.
if (ij_is_local()) {
    $db_info['host'] = $cfg['host'];
    $db_info['port'] = $cfg['port'];
    $db_info['name'] = $cfg['name'];
}

send_ok([
    'service'   => 'interstitial-journal-api',
    'version'   => '0.1.0',
    'env'       => $env,
    'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
    'php'       => PHP_VERSION,
    'db'        => $db_info,
]);
