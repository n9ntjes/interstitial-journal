<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('method_not_allowed', 'GET only', 405);
}

$user = require_user();

$tz_name = (string) ($_GET['tz'] ?? 'UTC');
try {
    $tz = new DateTimeZone($tz_name);
} catch (Throwable) {
    $tz = new DateTimeZone('UTC');
}

$from_s = (string) ($_GET['from'] ?? '');
$to_s   = (string) ($_GET['to']   ?? '');

$now = new DateTimeImmutable('now', $tz);
try {
    $from = $from_s !== '' ? new DateTimeImmutable($from_s, $tz) : $now->modify('-52 week');
    $to   = $to_s   !== '' ? new DateTimeImmutable($to_s,   $tz) : $now;
} catch (Throwable) {
    send_error('invalid_range', 'Bad from/to', 400);
}

$rows_stmt = db()->prepare('SELECT created_at FROM entries WHERE user_id = :uid');
$rows_stmt->execute([':uid' => $user['id']]);
$rows = $rows_stmt->fetchAll();

$counts = [];
foreach ($rows as $r) {
    try {
        $dt = (new DateTimeImmutable((string) $r['created_at']))->setTimezone($tz);
    } catch (Throwable) { continue; }
    if ($dt < $from || $dt > $to) continue;
    $key = $dt->format('Y-m-d');
    $counts[$key] = ($counts[$key] ?? 0) + 1;
}

// Emit one row per day in [from, to] so the grid is dense.
$out   = [];
$day   = $from->setTime(0, 0, 0);
$last  = $to->setTime(23, 59, 59);
while ($day <= $last) {
    $key   = $day->format('Y-m-d');
    $out[] = ['dayKey' => $key, 'count' => $counts[$key] ?? 0];
    $day   = $day->modify('+1 day');
}

send_ok(['days' => $out]);
