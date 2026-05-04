<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('method_not_allowed', 'GET only', 405);
}

$user = require_user();

$stmt = db()->prepare(
    'SELECT et.tag, COUNT(*) AS c
       FROM entry_tags et
       INNER JOIN entries e ON e.id = et.entry_id
       WHERE e.user_id = :uid
       GROUP BY et.tag
       ORDER BY c DESC, et.tag ASC'
);
$stmt->execute([':uid' => $user['id']]);

$tags = array_map(static fn(array $r): array => [
    'tag'   => (string) $r['tag'],
    'count' => (int) $r['c'],
], $stmt->fetchAll());

send_ok(['tags' => $tags]);
