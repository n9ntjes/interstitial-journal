<?php
declare(strict_types=1);

/**
 * Sample config. Copy to config.local.php and fill in real values.
 *
 *   cp api/config.local.example.php api/config.local.php
 *
 * config.local.php is gitignored. Any key present there overrides the
 * hard-coded defaults in _config.php. Environment variables (IJ_DB_HOST,
 * IJ_DB_PORT, IJ_DB_NAME, IJ_DB_USER, IJ_DB_PASS, IJ_DB_CHARSET, IJ_ENV)
 * still take precedence over this file, so the same file can be dropped
 * onto production as a fallback without leaking secrets into the repo.
 */

return [
    'env' => 'local',           // 'local' | 'staging' | 'production'
    'db'  => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'REPLACE_ME_DB_NAME',
        'user'    => 'REPLACE_ME_USER',
        'pass'    => 'REPLACE_ME_PASSWORD',
        'charset' => 'utf8mb4',
    ],
];
