<?php
declare(strict_types=1);

/**
 * MySQL datastore.
 *
 * Connection config comes from ij_db_config() (_config.php): env vars
 * override config.local.php which overrides built-in defaults.
 *
 * Schema is ensured on first connection (CREATE TABLE IF NOT EXISTS) so
 * fresh deploys work without a separate migration step. The one-off
 * import from the old SQLite file lives in migrate_sqlite_to_mysql.php.
 *
 * Auth-era upgrade: pre-auth installs had `entries` and `entry_images` tables
 * without `user_id`. ensure_schema() detects the legacy shape, lazily creates
 * a single "legacy" user, backfills ownership, and then applies the NOT NULL
 * + FK constraints. Runs once; subsequent calls short-circuit.
 */

require_once __DIR__ . '/_config.php';

function ij_mysql_found_rows_attr(): ?int {
    if (class_exists('Pdo\\Mysql') && defined('Pdo\\Mysql::ATTR_FOUND_ROWS')) {
        /** @var int */
        return constant('Pdo\\Mysql::ATTR_FOUND_ROWS');
    }

    if (defined('PDO::MYSQL_ATTR_FOUND_ROWS')) {
        /** @var int */
        return constant('PDO::MYSQL_ATTR_FOUND_ROWS');
    }

    return null;
}

function ij_mysql_pdo_options(): array {
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $found_rows_attr = ij_mysql_found_rows_attr();
    if ($found_rows_attr !== null) {
        $options[$found_rows_attr] = true;
    }

    return $options;
}

function ij_mysql_schema_sql(): array {
    return [
        "
        CREATE TABLE IF NOT EXISTS users (
            id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            email         VARCHAR(255)    NOT NULL,
            password_hash VARCHAR(255)    NOT NULL,
            display_name  VARCHAR(120)    NULL,
            created_at    VARCHAR(32)     NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_users_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        "
        CREATE TABLE IF NOT EXISTS sessions (
            token      CHAR(64)        NOT NULL,
            user_id    BIGINT UNSIGNED NOT NULL,
            created_at VARCHAR(32)     NOT NULL,
            expires_at VARCHAR(32)     NOT NULL,
            user_agent VARCHAR(255)    NULL,
            source     VARCHAR(16)     NOT NULL DEFAULT 'web',
            PRIMARY KEY (token),
            KEY idx_sessions_user (user_id),
            CONSTRAINT fk_sessions_user
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        "
        CREATE TABLE IF NOT EXISTS device_tokens (
            token      CHAR(64)        NOT NULL,
            user_id    BIGINT UNSIGNED NOT NULL,
            label      VARCHAR(120)    NULL,
            platform   VARCHAR(32)     NULL,
            created_at VARCHAR(32)     NOT NULL,
            last_seen  VARCHAR(32)     NULL,
            revoked_at VARCHAR(32)     NULL,
            PRIMARY KEY (token),
            KEY idx_device_tokens_user (user_id),
            CONSTRAINT fk_device_tokens_user
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        "
        CREATE TABLE IF NOT EXISTS entries (
            id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id    BIGINT UNSIGNED NOT NULL,
            created_at VARCHAR(32)     NOT NULL,
            content    MEDIUMTEXT      NOT NULL,
            source     VARCHAR(16)     NOT NULL DEFAULT 'api',
            updated_at VARCHAR(32)     NOT NULL,
            PRIMARY KEY (id),
            KEY idx_entries_user_created (user_id, created_at, id),
            KEY idx_entries_created_at (created_at, id),
            CONSTRAINT fk_entries_user
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        "
        CREATE TABLE IF NOT EXISTS entry_tags (
            entry_id BIGINT UNSIGNED NOT NULL,
            tag      VARCHAR(64)     NOT NULL,
            PRIMARY KEY (entry_id, tag),
            KEY idx_entry_tags_tag (tag),
            CONSTRAINT fk_entry_tags_entry
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        "
        CREATE TABLE IF NOT EXISTS entry_images (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id         BIGINT UNSIGNED NULL,
            entry_id        BIGINT UNSIGNED NULL,
            mime            VARCHAR(64)     NOT NULL,
            width           INT             NULL,
            height          INT             NULL,
            created_at      VARCHAR(32)     NOT NULL,
            storage_relpath VARCHAR(255)    NULL,
            PRIMARY KEY (id),
            KEY idx_entry_images_entry (entry_id),
            KEY idx_entry_images_user (user_id),
            CONSTRAINT fk_entry_images_entry
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
    ];
}

/** Legacy account that owns rows created before auth existed. */
const IJ_LEGACY_USER_EMAIL = 'legacy@interstitial.local';

function db(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $cfg = ij_db_config();

    if ($cfg['name'] === '' || $cfg['user'] === '') {
        send_error(
            'db_not_configured',
            'Database is not configured. Set IJ_DB_* env vars or fill api/config.local.php.',
            500
        );
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $cfg['host'],
        $cfg['port'],
        $cfg['name'],
        $cfg['charset']
    );

    try {
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], ij_mysql_pdo_options());
    } catch (PDOException $e) {
        $details = ij_is_local()
            ? ['host' => $cfg['host'], 'port' => $cfg['port'], 'db' => $cfg['name'], 'driver' => $e->getMessage()]
            : [];
        send_error('db_unavailable', 'Could not connect to the database.', 500, $details);
    }

    ensure_schema($pdo);
    ensure_data_uploads_dir();

    return $pdo;
}

function ensure_schema(PDO $pdo): void {
    foreach (ij_mysql_schema_sql() as $sql) {
        $pdo->exec($sql);
    }
    ensure_auth_upgrade($pdo);
}

function column_exists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = :t
             AND COLUMN_NAME = :c
           LIMIT 1'
    );
    $stmt->execute([':t' => $table, ':c' => $column]);
    return $stmt->fetchColumn() !== false;
}

function constraint_exists(PDO $pdo, string $table, string $constraint): bool {
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = :t
             AND CONSTRAINT_NAME = :c
           LIMIT 1'
    );
    $stmt->execute([':t' => $table, ':c' => $constraint]);
    return $stmt->fetchColumn() !== false;
}

/**
 * Idempotent upgrade for pre-auth installs. CREATE TABLE IF NOT EXISTS
 * skips the new columns when the table already existed, so we reconcile
 * by hand. Runs once per connection cache — very cheap when no-op.
 */
function ensure_auth_upgrade(PDO $pdo): void {
    $needs_entries_user_id = !column_exists($pdo, 'entries', 'user_id');
    $needs_images_user_id  = !column_exists($pdo, 'entry_images', 'user_id');

    if (!$needs_entries_user_id && !$needs_images_user_id) {
        return;
    }

    $legacy_id = ensure_legacy_user($pdo);

    if ($needs_entries_user_id) {
        $pdo->exec('ALTER TABLE entries ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
        $pdo->exec('UPDATE entries SET user_id = ' . $legacy_id . ' WHERE user_id IS NULL');
        $pdo->exec('ALTER TABLE entries MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL');
        if (!constraint_exists($pdo, 'entries', 'fk_entries_user')) {
            $pdo->exec(
                'ALTER TABLE entries
                   ADD CONSTRAINT fk_entries_user
                   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
            );
        }
        $pdo->exec('CREATE INDEX idx_entries_user_created ON entries (user_id, created_at, id)');
    }

    if ($needs_images_user_id) {
        $pdo->exec('ALTER TABLE entry_images ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
        // Attach via existing entry_id link where available; stragglers stay on legacy.
        $pdo->exec(
            'UPDATE entry_images ei
                LEFT JOIN entries e ON e.id = ei.entry_id
                SET ei.user_id = COALESCE(e.user_id, ' . $legacy_id . ')
              WHERE ei.user_id IS NULL'
        );
        $pdo->exec('CREATE INDEX idx_entry_images_user ON entry_images (user_id)');
    }
}

function ensure_legacy_user(PDO $pdo): int {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :e');
    $stmt->execute([':e' => IJ_LEGACY_USER_EMAIL]);
    $existing = $stmt->fetchColumn();
    if ($existing !== false) {
        return (int) $existing;
    }

    $ins = $pdo->prepare(
        'INSERT INTO users (email, password_hash, display_name, created_at)
         VALUES (:e, :h, :n, :c)'
    );
    // Random unusable password hash — legacy account can only be reached by
    // password reset (not implemented) or by the operator promoting an entry.
    $ins->execute([
        ':e' => IJ_LEGACY_USER_EMAIL,
        ':h' => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
        ':n' => 'Legacy data',
        ':c' => gmdate('Y-m-d\TH:i:s\Z'),
    ]);
    return (int) $pdo->lastInsertId();
}

function ensure_data_uploads_dir(): void {
    $dir = __DIR__ . '/data/uploads';
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        send_error('storage_unavailable', "Cannot create uploads directory at $dir", 500);
    }
}
