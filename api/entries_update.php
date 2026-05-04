<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';
require __DIR__ . '/_tags.php';
require __DIR__ . '/_images.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'PATCH' && $method !== 'POST') {
    send_error('method_not_allowed', 'PATCH only', 405);
}

$user = require_user();

$id = (int) ($_GET['id'] ?? 0);
if ($id < 1) send_error('invalid_id', 'Missing or invalid id', 400);

$body = read_json_body();
$content = trim((string) ($body['content'] ?? ''));
if ($content === '') send_error('empty_content', 'Content is required', 422);
if (mb_strlen($content) > 10_000) send_error('content_too_long', 'Max 10000 chars', 422);

$pdo = db();

// rowCount() for UPDATE returns 0 when values are unchanged, so check
// existence + ownership explicitly before updating to keep the 404 correct.
$exists = $pdo->prepare('SELECT 1 FROM entries WHERE id = :id AND user_id = :uid');
$exists->execute([':id' => $id, ':uid' => $user['id']]);
if ($exists->fetchColumn() === false) send_error('not_found', 'No entry with that id', 404);

$updated_at = gmdate('Y-m-d\TH:i:s\Z');
$stmt = $pdo->prepare(
    'UPDATE entries SET content = :c, updated_at = :u WHERE id = :id AND user_id = :uid'
);
$stmt->execute([':c' => $content, ':u' => $updated_at, ':id' => $id, ':uid' => $user['id']]);

$tags = sync_entry_tags($pdo, $id, $content);

$sel = $pdo->prepare(
    'SELECT id, created_at, content, source FROM entries WHERE id = :id AND user_id = :uid'
);
$sel->execute([':id' => $id, ':uid' => $user['id']]);
$row = $sel->fetch();

$images = load_entry_images($pdo, $id);

send_ok([
    'entry' => [
        'id'         => (int) $row['id'],
        'created_at' => (string) $row['created_at'],
        'content'    => (string) $row['content'],
        'source'     => (string) $row['source'],
        'tags'       => $tags,
        'images'     => $images,
    ],
]);
