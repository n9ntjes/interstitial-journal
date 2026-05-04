<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

$user = require_user();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_error('method_not_allowed', 'GET only', 405);
}

$platform = trim((string) ($_GET['platform'] ?? ''));
if ($platform === '') $platform = null;
if ($platform !== null && mb_strlen($platform) > 32) {
    send_error('invalid_platform', 'Platform too long', 422);
}

$pdo   = db();
$label = $platform !== null ? 'Desktop · ' . $platform : 'Desktop';
$token = mint_device_token($pdo, (int) $user['id'], $label, $platform);

$api_origin = ($_SERVER['HTTPS'] ?? '') !== '' ? 'https' : 'http';
$host       = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
$api_base   = $api_origin . '://' . $host . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/'), '/');

$pair_url = 'ij://pair?' . http_build_query([
    'token'      => $token,
    'api_base'   => $api_base,
    'user_email' => (string) $user['email'],
]);

send_ok(['pair_url' => $pair_url]);
