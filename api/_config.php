<?php
declare(strict_types=1);

/**
 * Config + environment resolution.
 *
 * Precedence (highest wins):
 *   1. Environment variables (IJ_ENV, IJ_DB_HOST, IJ_DB_PORT, IJ_DB_NAME,
 *      IJ_DB_USER, IJ_DB_PASS, IJ_DB_CHARSET)
 *   2. api/config.local.php (gitignored; see config.local.example.php)
 *   3. Hard-coded safe defaults in this file
 *
 * Environment detection order:
 *   - IJ_ENV env var (if set)
 *   - APP_ENV env var (if set)
 *   - config.local.php 'env' key
 *   - Hostname heuristic: localhost / 127.0.0.1 / *.local / *.test → 'local'
 *   - Fallback: 'production' (fail-safe for deploy targets)
 */

function ij_env_var(string $name): ?string {
    $v = getenv($name);
    if ($v === false || $v === '') {
        $v = $_ENV[$name] ?? $_SERVER[$name] ?? null;
    }
    if ($v === null || $v === false || $v === '') {
        return null;
    }
    return (string) $v;
}

function ij_load_local_config(): array {
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $path = __DIR__ . '/config.local.php';
    if (is_file($path)) {
        /** @psalm-suppress UnresolvableInclude */
        $loaded = require $path;
        if (is_array($loaded)) {
            $cached = $loaded;
            return $cached;
        }
    }
    $cached = [];
    return $cached;
}

function ij_detect_env(): string {
    $explicit = ij_env_var('IJ_ENV') ?? ij_env_var('APP_ENV');
    if ($explicit !== null) {
        return strtolower($explicit);
    }

    $local = ij_load_local_config();
    if (isset($local['env']) && is_string($local['env']) && $local['env'] !== '') {
        return strtolower($local['env']);
    }

    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? gethostname() ?: '';
    $host = strtolower((string) $host);
    if ($host === ''
        || $host === 'localhost'
        || str_starts_with($host, 'localhost:')
        || str_starts_with($host, '127.0.0.1')
        || str_ends_with($host, '.local')
        || str_ends_with($host, '.test')
    ) {
        return 'local';
    }
    return 'production';
}

function ij_is_local(): bool {
    return ij_detect_env() === 'local';
}

/**
 * @return array{
 *     host: string, port: int, name: string, user: string,
 *     pass: string, charset: string
 * }
 */
function ij_db_config(): array {
    $local = ij_load_local_config();
    $file  = is_array($local['db'] ?? null) ? $local['db'] : [];

    $host = ij_env_var('IJ_DB_HOST')
        ?? (isset($file['host']) ? (string) $file['host'] : '127.0.0.1');

    $port_raw = ij_env_var('IJ_DB_PORT')
        ?? (isset($file['port']) ? (string) $file['port'] : '3306');
    $port = (int) $port_raw;
    if ($port < 1 || $port > 65535) $port = 3306;

    $name = ij_env_var('IJ_DB_NAME')
        ?? (isset($file['name']) ? (string) $file['name'] : '');

    $user = ij_env_var('IJ_DB_USER')
        ?? (isset($file['user']) ? (string) $file['user'] : '');

    $pass = ij_env_var('IJ_DB_PASS')
        ?? (isset($file['pass']) ? (string) $file['pass'] : '');

    $charset = ij_env_var('IJ_DB_CHARSET')
        ?? (isset($file['charset']) ? (string) $file['charset'] : 'utf8mb4');

    return [
        'host'    => $host,
        'port'    => $port,
        'name'    => $name,
        'user'    => $user,
        'pass'    => $pass,
        'charset' => $charset,
    ];
}
