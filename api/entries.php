<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';
require __DIR__ . '/_tags.php';
require __DIR__ . '/_images.php';

$auth   = require_auth_context();
$user   = $auth['user'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $limit = (int) ($_GET['limit'] ?? 50);
    if ($limit < 1) $limit = 1;
    if ($limit > 200) $limit = 200;

    $where  = ['e.user_id = :uid'];
    $params = [':uid' => $user['id']];

    $from = (string) ($_GET['from'] ?? '');
    if ($from !== '') {
        $where[]           = 'e.created_at >= :from';
        $params[':from']   = $from;
    }
    $to = (string) ($_GET['to'] ?? '');
    if ($to !== '') {
        $where[]         = 'e.created_at <= :to';
        $params[':to']   = $to;
    }
    $q = (string) ($_GET['q'] ?? '');
    if ($q !== '') {
        $where[]      = 'LOWER(e.content) LIKE :q';
        $params[':q'] = '%' . mb_strtolower($q) . '%';
    }

    $tag = (string) ($_GET['tag'] ?? '');
    $join = '';
    if ($tag !== '') {
        $join           = ' INNER JOIN entry_tags et ON et.entry_id = e.id ';
        $where[]        = 'et.tag = :tag';
        $params[':tag'] = mb_strtolower($tag);
    }

    $sql = 'SELECT e.id, e.created_at, e.content, e.source FROM entries e'
         . $join
         . ' WHERE ' . implode(' AND ', $where)
         . ' ORDER BY e.created_at DESC, e.id DESC LIMIT :limit';

    $stmt = db()->prepare($sql);
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows    = $stmt->fetchAll();
    $ids     = array_map(static fn(array $r): int => (int) $r['id'], $rows);
    $tag_map = load_tags_for_entries(db(), $ids);
    $img_map = load_images_for_entries(db(), $ids);

    $entries = array_map(static fn(array $r): array => [
        'id'         => (int) $r['id'],
        'created_at' => (string) $r['created_at'],
        'content'    => (string) $r['content'],
        'source'     => (string) $r['source'],
        'tags'       => $tag_map[(int) $r['id']] ?? [],
        'images'     => $img_map[(int) $r['id']] ?? [],
    ], $rows);

    send_ok(['entries' => $entries]);
}

if ($method === 'POST') {
    $body = read_json_body();

    $image_ids = [];
    $raw_ids = $body['imageIds'] ?? [];
    if (is_array($raw_ids)) {
        foreach ($raw_ids as $raw) {
            $image_id = (int) $raw;
            if ($image_id > 0) {
                $image_ids[] = $image_id;
            }
        }
    }

    $content = trim((string) ($body['content'] ?? ''));
    if ($content === '' && $image_ids === []) {
        send_error('empty_content', 'Content or at least one image is required', 422);
    }
    if ($content !== '' && mb_strlen($content) > 10_000) {
        send_error('content_too_long', 'Max 10000 chars', 422);
    }

    $allowed_sources = ['web', 'tauri', 'api'];
    $source = $body['source'] ?? 'api';
    if (!in_array($source, $allowed_sources, true)) {
        $source = 'api';
    }
    // Device-token callers are always the desktop client — honour the UI badge.
    if ($auth['via'] === 'device') {
        $source = 'tauri';
    }

    $created_at = (string) ($body['created_at'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $created_at)) {
        $created_at = gmdate('Y-m-d\TH:i:s\Z');
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO entries (user_id, created_at, content, source, updated_at)
         VALUES (:uid, :created_at, :content, :source, :updated_at)'
    );
    $stmt->execute([
        ':uid'        => $user['id'],
        ':created_at' => $created_at,
        ':content'    => $content,
        ':source'     => $source,
        ':updated_at' => $created_at,
    ]);

    $id   = (int) $pdo->lastInsertId();
    $tags = sync_entry_tags($pdo, $id, $content);

    $attached_images = [];
    if ($image_ids) {
        // Only attach images that belong to this user and are not yet linked.
        $placeholders = implode(',', array_fill(0, count($image_ids), '?'));
        $upd = $pdo->prepare(
            "UPDATE entry_images
                SET entry_id = ?
              WHERE id IN ($placeholders)
                AND entry_id IS NULL
                AND user_id = ?"
        );
        $upd->execute([$id, ...$image_ids, $user['id']]);

        $sel = $pdo->prepare(
            'SELECT id, mime, width, height FROM entry_images WHERE entry_id = ? AND user_id = ?'
        );
        $sel->execute([$id, $user['id']]);
        $attached_images = array_map(
            static fn(array $r): array => image_row_to_api($r),
            $sel->fetchAll()
        );
    }

    send_ok([
        'entry' => [
            'id'         => $id,
            'created_at' => $created_at,
            'content'    => $content,
            'source'     => $source,
            'tags'       => $tags,
            'images'     => $attached_images,
        ],
    ], 201);
}

send_error('method_not_allowed', "Method $method not allowed", 405);
