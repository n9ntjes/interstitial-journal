<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';
require __DIR__ . '/_tags.php';
require __DIR__ . '/_images.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('method_not_allowed', 'GET only', 405);
}

$user = require_user();

$id = (int) ($_GET['id'] ?? 0);
if ($id < 1) send_error('invalid_id', 'Missing or invalid id', 400);

$stmt = db()->prepare(
    'SELECT id, created_at, content, source FROM entries WHERE id = :id AND user_id = :uid'
);
$stmt->execute([':id' => $id, ':uid' => $user['id']]);
$row = $stmt->fetch();
if (!$row) send_error('not_found', 'No entry with that id', 404);

$eid = (int) $row['id'];
send_ok([
    'entry' => [
        'id'         => $eid,
        'created_at' => (string) $row['created_at'],
        'content'    => (string) $row['content'],
        'source'     => (string) $row['source'],
        'tags'       => load_entry_tags(db(), $eid),
        'images'     => load_entry_images(db(), $eid),
    ],
]);
