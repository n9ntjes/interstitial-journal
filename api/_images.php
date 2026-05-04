<?php
declare(strict_types=1);

/**
 * Entry image metadata and batch loading (mirrors _tags.php patterns).
 */

function image_row_to_api(array $r): array {
    return [
        'id'     => (int) $r['id'],
        'mime'   => (string) $r['mime'],
        'width'  => $r['width'] !== null && $r['width'] !== '' ? (int) $r['width'] : null,
        'height' => $r['height'] !== null && $r['height'] !== '' ? (int) $r['height'] : null,
        'url'    => 'images_show.php?id=' . (int) $r['id'],
    ];
}

/**
 * @return array<int, array<int, array>> entry_id => list of image dicts
 */
function load_images_for_entries(PDO $pdo, array $entry_ids): array {
    if ($entry_ids === []) {
        return [];
    }
    $place = implode(',', array_fill(0, count($entry_ids), '?'));
    $stmt  = $pdo->prepare(
        "SELECT id, entry_id, mime, width, height FROM entry_images
         WHERE entry_id IN ($place) AND entry_id IS NOT NULL
         ORDER BY id ASC"
    );
    $stmt->execute($entry_ids);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $eid = (int) $row['entry_id'];
        $map[$eid][] = image_row_to_api($row);
    }
    return $map;
}

function load_entry_images(PDO $pdo, int $entry_id): array {
    $stmt = $pdo->prepare(
        'SELECT id, mime, width, height FROM entry_images WHERE entry_id = :id ORDER BY id ASC'
    );
    $stmt->execute([':id' => $entry_id]);
    return array_map(static fn(array $r): array => image_row_to_api($r), $stmt->fetchAll());
}

/**
 * Only filenames we store: "{id}.png" under data/uploads.
 */
function image_file_abs_for_relpath(string $relpath): ?string {
    if (!preg_match('/^\d+\.png$/', $relpath)) {
        return null;
    }
    $dir = __DIR__ . '/data/uploads';
    $abs = $dir . '/' . $relpath;
    $d   = realpath($dir);
    if ($d === false) {
        return null;
    }
    $r = realpath($abs);
    if ($r !== false && is_file($r) && str_starts_with($r, $d . DIRECTORY_SEPARATOR)) {
        return $r;
    }
    return null;
}

/**
 * @return list<string> relative filenames under uploads/
 */
function image_paths_for_entry(PDO $pdo, int $entry_id): array {
    $stmt = $pdo->prepare(
        'SELECT storage_relpath FROM entry_images WHERE entry_id = :id AND storage_relpath IS NOT NULL'
    );
    $stmt->execute([':id' => $entry_id]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $p = (string) $row['storage_relpath'];
        if ($p !== '') {
            $out[] = $p;
        }
    }
    return $out;
}

function unlink_stored_image_files(PDO $pdo, int $entry_id): void {
    foreach (image_paths_for_entry($pdo, $entry_id) as $rel) {
        $abs = image_file_abs_for_relpath($rel);
        if ($abs !== null) {
            @unlink($abs);
        }
    }
}
