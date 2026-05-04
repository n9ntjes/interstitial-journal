<?php
declare(strict_types=1);

/**
 * One-off importer: SQLite (api/data/ij.sqlite) → MySQL (via _config.php),
 * or a MySQL-compatible SQL file for phpMyAdmin / shared-host imports.
 *
 *   php api/migrate_sqlite_to_mysql.php --yes
 *   php api/migrate_sqlite_to_mysql.php --yes --truncate
 *   php api/migrate_sqlite_to_mysql.php --yes --dry-run
 *   php api/migrate_sqlite_to_mysql.php --yes --sql-file=api/data/ij_mysql_import.sql
 *
 * Preserves primary key IDs so existing on-disk image files (data/uploads/{id}.png)
 * continue to resolve. Legacy rows that still keep PNG bytes in entry_images.bytes
 * are written to disk and their storage_relpath is set during import/export.
 *
 * Safe to run multiple times if you pair it with --truncate: it does not
 * modify the SQLite file.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "This script is CLI-only. Run: php api/migrate_sqlite_to_mysql.php --yes\n";
    exit(1);
}

$opts = getopt('', ['yes', 'truncate', 'dry-run', 'sqlite::', 'sql-file:']);

if (!isset($opts['yes'])) {
    fwrite(STDERR, "Refusing to run without --yes.\n");
    fwrite(STDERR, migration_usage());
    exit(2);
}

$dry      = isset($opts['dry-run']);
$truncate = isset($opts['truncate']);
$sqlite_path = isset($opts['sqlite']) && $opts['sqlite'] !== ''
    ? (string) $opts['sqlite']
    : __DIR__ . '/data/ij.sqlite';

$sql_file = null;
if (array_key_exists('sql-file', $opts)) {
    if ($opts['sql-file'] === false || $opts['sql-file'] === '') {
        fwrite(STDERR, "--sql-file requires a path.\n");
        fwrite(STDERR, migration_usage());
        exit(2);
    }
    $sql_file = (string) $opts['sql-file'];
}

if (!is_file($sqlite_path)) {
    fwrite(STDERR, "SQLite file not found: $sqlite_path\n");
    exit(3);
}

function migration_usage(): string {
    return "Usage: php api/migrate_sqlite_to_mysql.php --yes [--truncate] [--dry-run] "
        . "[--sqlite=/path/to/ij.sqlite] [--sql-file=/path/to/import.sql]\n";
}

// The MySQL connection handler (db()) lives behind send_error(), which is
// HTTP-oriented. Stub the HTTP helpers so failures print to stderr and exit.
function send_error(string $code, string $message, int $status = 500, array $details = []): never {
    fwrite(STDERR, "[$code] $message\n");
    if ($details) {
        fwrite(STDERR, json_encode($details, JSON_PRETTY_PRINT) . "\n");
    }

    $driver = (string) ($details['driver'] ?? '');
    if ($code === 'db_unavailable' && $driver !== '') {
        if (str_contains($driver, '[1045]')) {
            fwrite(STDERR, "Hint: MySQL rejected this client or password.\n");
            fwrite(STDERR, "Hint: Shared hosts often require remote-DB access to be enabled or whitelisted first.\n");
            fwrite(STDERR, "Hint: If direct access stays blocked, export a MySQL file instead with --sql-file=...\n");
        } elseif (str_contains($driver, '[2002]') || str_contains($driver, '[2003]')) {
            fwrite(STDERR, "Hint: The MySQL host is unreachable from this machine.\n");
            fwrite(STDERR, "Hint: If that is expected on shared hosting, use --sql-file=... and import it server-side.\n");
        }
    }

    exit(10);
}
function send_ok(mixed $data, int $status = 200): never { exit(0); }

function migration_normalize_relpath(?string $relpath): ?string {
    if ($relpath === null || $relpath === '') {
        return null;
    }

    return ltrim(str_replace('\\', '/', $relpath), '/');
}

function migration_sqlite_has_column(PDO $src, string $table, string $column): bool {
    static $cache = [];

    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    $stmt = $src->query('PRAGMA table_info(' . $table . ')');
    foreach ($stmt as $row) {
        if ((string) $row['name'] === $column) {
            $cache[$key] = true;
            return true;
        }
    }

    $cache[$key] = false;
    return false;
}

function migration_entries_select_sql(PDO $src): string {
    $source_sql = migration_sqlite_has_column($src, 'entries', 'source')
        ? 'source'
        : "'api' AS source";
    $updated_sql = migration_sqlite_has_column($src, 'entries', 'updated_at')
        ? 'updated_at'
        : 'created_at AS updated_at';

    return "SELECT id, created_at, content, $source_sql, $updated_sql
            FROM entries
            ORDER BY id ASC";
}

function migration_entry_images_select_sql(PDO $src): string {
    $bytes_sql = migration_sqlite_has_column($src, 'entry_images', 'bytes')
        ? 'bytes'
        : 'NULL AS bytes';
    $width_sql = migration_sqlite_has_column($src, 'entry_images', 'width')
        ? 'width'
        : 'NULL AS width';
    $height_sql = migration_sqlite_has_column($src, 'entry_images', 'height')
        ? 'height'
        : 'NULL AS height';
    $created_sql = migration_sqlite_has_column($src, 'entry_images', 'created_at')
        ? 'created_at'
        : 'CURRENT_TIMESTAMP AS created_at';
    $storage_sql = migration_sqlite_has_column($src, 'entry_images', 'storage_relpath')
        ? 'storage_relpath'
        : 'NULL AS storage_relpath';

    return "SELECT id, entry_id, mime, $bytes_sql, $width_sql, $height_sql, $created_sql, $storage_sql
            FROM entry_images
            ORDER BY id ASC";
}

function migration_materialize_legacy_blob(array $row, string $uploads_dir, int &$written): ?string {
    $relpath = migration_normalize_relpath(isset($row['storage_relpath']) ? (string) $row['storage_relpath'] : null);
    if ($relpath !== null) {
        return $relpath;
    }

    if (!isset($row['bytes']) || $row['bytes'] === null || $row['bytes'] === '') {
        return null;
    }

    $candidate = (int) $row['id'] . '.png';
    $abs = $uploads_dir . '/' . $candidate;
    if (!is_file($abs)) {
        if (@file_put_contents($abs, $row['bytes'], LOCK_EX) === false) {
            throw new RuntimeException("Could not write legacy BLOB for image id={$row['id']} to $abs");
        }
        $written++;
    }

    return $candidate;
}

function migration_uploads_preflight(PDO $src, string $uploads_dir): array {
    $summary = [
        'referenced'     => 0,
        'missing'        => 0,
        'missing_paths'  => [],
        'blob_only'      => 0,
    ];

    if (migration_sqlite_has_column($src, 'entry_images', 'storage_relpath')) {
        $q = $src->query(
            "SELECT storage_relpath
             FROM entry_images
             WHERE storage_relpath IS NOT NULL AND storage_relpath <> ''
             ORDER BY id ASC"
        );
        foreach ($q as $r) {
            $relpath = migration_normalize_relpath((string) $r['storage_relpath']);
            if ($relpath === null) {
                continue;
            }

            $summary['referenced']++;
            if (!is_file($uploads_dir . '/' . $relpath)) {
                $summary['missing']++;
                if (count($summary['missing_paths']) < 5) {
                    $summary['missing_paths'][] = $relpath;
                }
            }
        }
    }

    if (migration_sqlite_has_column($src, 'entry_images', 'bytes')) {
        $blob_only_sql = migration_sqlite_has_column($src, 'entry_images', 'storage_relpath')
            ? "SELECT COUNT(*)
               FROM entry_images
               WHERE (storage_relpath IS NULL OR storage_relpath = '')
                 AND bytes IS NOT NULL
                 AND length(bytes) > 0"
            : "SELECT COUNT(*)
               FROM entry_images
               WHERE bytes IS NOT NULL
                 AND length(bytes) > 0";

        $summary['blob_only'] = (int) $src->query($blob_only_sql)->fetchColumn();
    }

    return $summary;
}

function migration_mysql_sql_value(mixed $value): string {
    if ($value === null) {
        return 'NULL';
    }
    if (is_int($value) || is_float($value)) {
        return (string) $value;
    }

    return "'" . strtr((string) $value, [
        "\\"   => "\\\\",
        "\0"   => "\\0",
        "\n"   => "\\n",
        "\r"   => "\\r",
        "\x1a" => "\\Z",
        "'"    => "\\'",
    ]) . "'";
}

function migration_write_insert_batch($handle, string $table, array $columns, array $rows): void {
    if ($rows === []) {
        return;
    }

    $quoted_columns = array_map(
        static fn (string $column): string => '`' . $column . '`',
        $columns
    );

    fwrite($handle, 'INSERT INTO `' . $table . '` (' . implode(', ', $quoted_columns) . ") VALUES\n");

    $tuples = [];
    foreach ($rows as $row) {
        $tuples[] = '  (' . implode(', ', array_map('migration_mysql_sql_value', $row)) . ')';
    }

    fwrite($handle, implode(",\n", $tuples) . ";\n\n");
}

function migration_export_sql_file(string $sql_file, PDO $src, bool $truncate): array {
    $dir = dirname($sql_file);
    if ($dir !== '' && $dir !== '.' && !is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException("Could not create output directory: $dir");
    }

    $handle = @fopen($sql_file, 'wb');
    if ($handle === false) {
        throw new RuntimeException("Could not open SQL output file for writing: $sql_file");
    }

    ensure_data_uploads_dir();
    $uploads_dir = __DIR__ . '/data/uploads';

    $stats = [
        'entries'              => 0,
        'entry_tags'           => 0,
        'entry_images'         => 0,
        'legacy_blobs_written' => 0,
    ];

    try {
        fwrite($handle, "-- Interstitial Journal MySQL import\n");
        fwrite($handle, '-- Generated at ' . gmdate('Y-m-d\TH:i:s\Z') . "\n\n");
        fwrite($handle, "SET NAMES utf8mb4;\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS = 0;\n");
        fwrite($handle, "START TRANSACTION;\n\n");

        foreach (ij_mysql_schema_sql() as $sql) {
            fwrite($handle, trim($sql) . ";\n\n");
        }

        if ($truncate) {
            fwrite($handle, "TRUNCATE TABLE `entry_tags`;\n");
            fwrite($handle, "TRUNCATE TABLE `entry_images`;\n");
            fwrite($handle, "TRUNCATE TABLE `entries`;\n\n");
        }

        $batch = [];
        $q = $src->query(migration_entries_select_sql($src));
        foreach ($q as $r) {
            $created = (string) $r['created_at'];
            $updated = (string) ($r['updated_at'] ?? '');
            if ($updated === '') {
                $updated = $created;
            }

            $batch[] = [
                (int) $r['id'],
                $created,
                (string) $r['content'],
                (string) ($r['source'] ?? 'api'),
                $updated,
            ];
            $stats['entries']++;

            if (count($batch) >= 250) {
                migration_write_insert_batch(
                    $handle,
                    'entries',
                    ['id', 'created_at', 'content', 'source', 'updated_at'],
                    $batch
                );
                $batch = [];
            }
        }
        migration_write_insert_batch(
            $handle,
            'entries',
            ['id', 'created_at', 'content', 'source', 'updated_at'],
            $batch
        );

        $batch = [];
        $q = $src->query('SELECT entry_id, tag FROM entry_tags ORDER BY entry_id ASC, tag ASC');
        foreach ($q as $r) {
            $batch[] = [(int) $r['entry_id'], (string) $r['tag']];
            $stats['entry_tags']++;

            if (count($batch) >= 250) {
                migration_write_insert_batch($handle, 'entry_tags', ['entry_id', 'tag'], $batch);
                $batch = [];
            }
        }
        migration_write_insert_batch($handle, 'entry_tags', ['entry_id', 'tag'], $batch);

        $batch = [];
        $q = $src->query(migration_entry_images_select_sql($src));
        foreach ($q as $r) {
            $relpath = migration_materialize_legacy_blob($r, $uploads_dir, $stats['legacy_blobs_written']);

            $batch[] = [
                (int) $r['id'],
                $r['entry_id'] !== null ? (int) $r['entry_id'] : null,
                (string) $r['mime'],
                $r['width'] !== null && $r['width'] !== '' ? (int) $r['width'] : null,
                $r['height'] !== null && $r['height'] !== '' ? (int) $r['height'] : null,
                (string) ($r['created_at'] ?? gmdate('Y-m-d\TH:i:s\Z')),
                $relpath,
            ];
            $stats['entry_images']++;

            if (count($batch) >= 250) {
                migration_write_insert_batch(
                    $handle,
                    'entry_images',
                    ['id', 'entry_id', 'mime', 'width', 'height', 'created_at', 'storage_relpath'],
                    $batch
                );
                $batch = [];
            }
        }
        migration_write_insert_batch(
            $handle,
            'entry_images',
            ['id', 'entry_id', 'mime', 'width', 'height', 'created_at', 'storage_relpath'],
            $batch
        );

        foreach (['entries', 'entry_images'] as $table) {
            $max = (int) $src->query("SELECT COALESCE(MAX(id), 0) FROM $table")->fetchColumn();
            fwrite($handle, 'ALTER TABLE `' . $table . '` AUTO_INCREMENT = ' . ($max + 1) . ";\n");
        }

        fwrite($handle, "\nCOMMIT;\n");
        fwrite($handle, "SET FOREIGN_KEY_CHECKS = 1;\n");
    } finally {
        fclose($handle);
    }

    return $stats;
}

require __DIR__ . '/_config.php';
require __DIR__ . '/_db.php';

echo "== SQLite → MySQL migration ==\n";
echo "SQLite:   $sqlite_path\n";
if ($sql_file !== null) {
    echo "Mode:     SQL file export\n";
    echo "SQL file: $sql_file\n";
} else {
    $cfg = ij_db_config();
    echo "Mode:     Direct MySQL import\n";
    echo "MySQL:    {$cfg['user']}@{$cfg['host']}:{$cfg['port']}/{$cfg['name']}\n";
}
echo "Env:      " . ij_detect_env() . "\n";
echo "Dry-run:  " . ($dry ? 'yes' : 'no') . "\n";
echo "Truncate: " . ($truncate ? 'yes' : 'no') . "\n\n";

$src = new PDO('sqlite:' . $sqlite_path, null, null, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$src->exec('PRAGMA foreign_keys = ON');

$src_counts = [
    'entries'      => (int) $src->query('SELECT COUNT(*) FROM entries')->fetchColumn(),
    'entry_tags'   => (int) $src->query('SELECT COUNT(*) FROM entry_tags')->fetchColumn(),
    'entry_images' => (int) $src->query('SELECT COUNT(*) FROM entry_images')->fetchColumn(),
];
echo "SQLite row counts:\n";
foreach ($src_counts as $table => $count) {
    echo "  $table: $count\n";
}
echo "\n";

$uploads_dir = __DIR__ . '/data/uploads';
$uploads = migration_uploads_preflight($src, $uploads_dir);
echo "Uploads preflight:\n";
echo "  referenced files: {$uploads['referenced']}\n";
echo "  missing local files: {$uploads['missing']}\n";
if ($uploads['missing_paths'] !== []) {
    echo "  sample missing paths: " . implode(', ', $uploads['missing_paths']) . "\n";
}
echo "  legacy BLOB-only rows: {$uploads['blob_only']}\n\n";

if ($sql_file !== null) {
    if ($dry) {
        echo "Dry run — SQL file not written.\n";
        if ($uploads['blob_only'] > 0) {
            echo "A real run would materialize {$uploads['blob_only']} legacy image file(s) under api/data/uploads.\n";
        }
        exit(0);
    }

    echo "Writing MySQL import SQL...\n";
    try {
        $written = migration_export_sql_file($sql_file, $src, $truncate);
    } catch (Throwable $e) {
        fwrite(STDERR, "SQL export failed: " . $e->getMessage() . "\n");
        exit(6);
    }

    echo "Rows exported:\n";
    echo "  entries: {$written['entries']}\n";
    echo "  entry_tags: {$written['entry_tags']}\n";
    echo "  entry_images: {$written['entry_images']}\n";
    echo "  legacy BLOBs written to disk: {$written['legacy_blobs_written']}\n";
    echo "\nImport $sql_file into MySQL, then copy api/data/uploads/ to the server.\n";
    exit(0);
}

$dst = db();

$dst_counts = [
    'entries'      => (int) $dst->query('SELECT COUNT(*) FROM entries')->fetchColumn(),
    'entry_tags'   => (int) $dst->query('SELECT COUNT(*) FROM entry_tags')->fetchColumn(),
    'entry_images' => (int) $dst->query('SELECT COUNT(*) FROM entry_images')->fetchColumn(),
];
echo "MySQL row counts (before):\n";
foreach ($dst_counts as $table => $count) {
    echo "  $table: $count\n";
}
echo "\n";

if ($dry) {
    echo "Dry run — not writing anything. Exiting.\n";
    exit(0);
}

$total_dst = array_sum($dst_counts);
if ($total_dst > 0 && !$truncate) {
    fwrite(STDERR, "MySQL already has $total_dst rows. Re-run with --truncate to wipe & re-import.\n");
    exit(4);
}

if ($truncate) {
    echo "Truncating MySQL tables...\n";
    $dst->exec('SET FOREIGN_KEY_CHECKS = 0');
    $dst->exec('TRUNCATE TABLE entry_tags');
    $dst->exec('TRUNCATE TABLE entry_images');
    $dst->exec('TRUNCATE TABLE entries');
    $dst->exec('SET FOREIGN_KEY_CHECKS = 1');
}

ensure_data_uploads_dir();
$uploads_dir = __DIR__ . '/data/uploads';

// Disable FK checks during the import so row order across tables doesn't matter.
$dst->exec('SET FOREIGN_KEY_CHECKS = 0');
$dst->beginTransaction();

try {
    echo "Importing entries...\n";
    $in_entries = $dst->prepare(
        'INSERT INTO entries (id, created_at, content, source, updated_at)
         VALUES (:id, :created_at, :content, :source, :updated_at)'
    );
    $n_entries = 0;
    $q = $src->query(migration_entries_select_sql($src));
    foreach ($q as $r) {
        $created = (string) $r['created_at'];
        $updated = (string) ($r['updated_at'] ?? '');
        if ($updated === '') {
            $updated = $created;
        }

        $in_entries->execute([
            ':id'         => (int) $r['id'],
            ':created_at' => $created,
            ':content'    => (string) $r['content'],
            ':source'     => (string) ($r['source'] ?? 'api'),
            ':updated_at' => $updated,
        ]);
        $n_entries++;

        if ($n_entries % 500 === 0) {
            echo "  ...$n_entries\n";
        }
    }
    echo "  entries: $n_entries\n";

    echo "Importing entry_tags...\n";
    $in_tag = $dst->prepare('INSERT INTO entry_tags (entry_id, tag) VALUES (:entry_id, :tag)');
    $n_tags = 0;
    $q = $src->query('SELECT entry_id, tag FROM entry_tags ORDER BY entry_id ASC, tag ASC');
    foreach ($q as $r) {
        $in_tag->execute([
            ':entry_id' => (int) $r['entry_id'],
            ':tag'      => (string) $r['tag'],
        ]);
        $n_tags++;
    }
    echo "  entry_tags: $n_tags\n";

    echo "Importing entry_images...\n";
    $in_img = $dst->prepare(
        'INSERT INTO entry_images (id, entry_id, mime, width, height, created_at, storage_relpath)
         VALUES (:id, :entry_id, :mime, :width, :height, :created_at, :relpath)'
    );
    $n_imgs = 0;
    $n_blobs_written = 0;
    $q = $src->query(migration_entry_images_select_sql($src));
    foreach ($q as $r) {
        $relpath = migration_materialize_legacy_blob($r, $uploads_dir, $n_blobs_written);

        $in_img->execute([
            ':id'         => (int) $r['id'],
            ':entry_id'   => $r['entry_id'] !== null ? (int) $r['entry_id'] : null,
            ':mime'       => (string) $r['mime'],
            ':width'      => $r['width'] !== null && $r['width'] !== '' ? (int) $r['width'] : null,
            ':height'     => $r['height'] !== null && $r['height'] !== '' ? (int) $r['height'] : null,
            ':created_at' => (string) ($r['created_at'] ?? gmdate('Y-m-d\TH:i:s\Z')),
            ':relpath'    => $relpath,
        ]);
        $n_imgs++;
    }
    echo "  entry_images: $n_imgs (legacy BLOBs written to disk: $n_blobs_written)\n";

    $dst->commit();
} catch (Throwable $e) {
    if ($dst->inTransaction()) {
        $dst->rollBack();
    }
    $dst->exec('SET FOREIGN_KEY_CHECKS = 1');
    fwrite(STDERR, "Import failed: " . $e->getMessage() . "\n");
    exit(5);
}

$dst->exec('SET FOREIGN_KEY_CHECKS = 1');

foreach (['entries', 'entry_images'] as $table) {
    $max = (int) $dst->query("SELECT COALESCE(MAX(id), 0) FROM $table")->fetchColumn();
    $dst->exec("ALTER TABLE $table AUTO_INCREMENT = " . ($max + 1));
}

echo "\nMySQL row counts (after):\n";
foreach (['entries', 'entry_tags', 'entry_images'] as $table) {
    $count = (int) $dst->query("SELECT COUNT(*) FROM $table")->fetchColumn();
    echo "  $table: $count\n";
}

echo "\nDone. Make sure api/data/uploads/ is deployed alongside the imported database.\n";
