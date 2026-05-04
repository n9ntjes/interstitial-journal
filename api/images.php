<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    send_error('method_not_allowed', "Method $method not allowed", 405);
}

$user = require_user();

if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
    send_error('missing_file', 'Multipart "file" field is required', 422);
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    send_error('upload_failed', 'File upload failed', 422, ['php_error' => $file['error']]);
}

$max_bytes = 10 * 1024 * 1024;
if ((int) $file['size'] > $max_bytes) {
    send_error('image_too_large', "Image exceeds {$max_bytes} bytes", 422);
}

$tmp = (string) $file['tmp_name'];
$bytes = @file_get_contents($tmp);
if ($bytes === false || $bytes === '') {
    send_error('unreadable_upload', 'Could not read upload', 500);
}

// PNG magic: 89 50 4E 47 0D 0A 1A 0A
if (substr($bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") {
    send_error('invalid_image', 'Only PNG is accepted', 422);
}

$width = null;
$height = null;
$info = @getimagesizefromstring($bytes);
if (is_array($info)) {
    $width = (int) $info[0];
    $height = (int) $info[1];
}

$pdo = db();
$stmt = $pdo->prepare(
    'INSERT INTO entry_images (user_id, entry_id, mime, width, height, created_at, storage_relpath)
     VALUES (:uid, NULL, :mime, :width, :height, :created_at, NULL)'
);
$stmt->bindValue(':uid', $user['id'], PDO::PARAM_INT);
$stmt->bindValue(':mime', 'image/png');
$stmt->bindValue(':width', $width, PDO::PARAM_INT);
$stmt->bindValue(':height', $height, PDO::PARAM_INT);
$stmt->bindValue(':created_at', gmdate('Y-m-d\TH:i:s\Z'));
$stmt->execute();

$id = (int) $pdo->lastInsertId();
$relpath = $id . '.png';
$abs     = __DIR__ . '/data/uploads/' . $relpath;

$written = @file_put_contents($abs, $bytes, LOCK_EX);
if ($written === false) {
    $del = $pdo->prepare('DELETE FROM entry_images WHERE id = :id');
    $del->execute([':id' => $id]);
    send_error('storage_unavailable', 'Could not write image to disk', 500);
}

$upd = $pdo->prepare('UPDATE entry_images SET storage_relpath = :p WHERE id = :id');
$upd->execute([':p' => $relpath, ':id' => $id]);

send_ok([
    'id'     => $id,
    'mime'   => 'image/png',
    'width'  => $width,
    'height' => $height,
    'url'    => "images_show.php?id=$id",
], 201);
