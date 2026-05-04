<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';
require __DIR__ . '/_images.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'DELETE' && $method !== 'POST') {
    send_error('method_not_allowed', 'DELETE only', 405);
}

$user = require_user();

$id = (int) ($_GET['id'] ?? 0);
if ($id < 1) send_error('invalid_id', 'Missing or invalid id', 400);

$pdo = db();

// Only allow deletion if the row belongs to this user; check before the
// file unlinks so we don't touch disk for a 404.
$owns = $pdo->prepare('SELECT 1 FROM entries WHERE id = :id AND user_id = :uid');
$owns->execute([':id' => $id, ':uid' => $user['id']]);
if ($owns->fetchColumn() === false) send_error('not_found', 'No entry with that id', 404);

unlink_stored_image_files($pdo, $id);

$stmt = $pdo->prepare('DELETE FROM entries WHERE id = :id AND user_id = :uid');
$stmt->execute([':id' => $id, ':uid' => $user['id']]);

http_response_code(204);
exit;
