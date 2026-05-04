<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';
require __DIR__ . '/_images.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    send_error('method_not_allowed', "Method $method not allowed", 405);
}

$user = require_user();

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    send_error('invalid_id', 'Query parameter "id" is required', 422);
}

$stmt = db()->prepare(
    'SELECT mime, storage_relpath
       FROM entry_images
       WHERE id = :id AND user_id = :uid'
);
$stmt->bindValue(':id', $id, PDO::PARAM_INT);
$stmt->bindValue(':uid', $user['id'], PDO::PARAM_INT);
$stmt->execute();
$row = $stmt->fetch();
if (!$row) {
    send_error('not_found', 'Image not found', 404);
}

$mime = (string) $row['mime'];
$relp = $row['storage_relpath'] !== null && $row['storage_relpath'] !== ''
    ? (string) $row['storage_relpath']
    : null;

if ($relp === null) {
    send_error('not_found', 'Image not found', 404);
}

$path = image_file_abs_for_relpath($relp);
if ($path === null) {
    send_error('not_found', 'Image not found', 404);
}

header_remove('Content-Type');
header('Content-Type: ' . $mime);
header('Cache-Control: private, max-age=3600');

$size = @filesize($path);
if ($size !== false) {
    header('Content-Length: ' . (string) $size);
}
readfile($path);
