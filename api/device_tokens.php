<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

$user   = require_user();
$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT token, label, platform, created_at, last_seen, revoked_at
           FROM device_tokens
           WHERE user_id = :u
           ORDER BY created_at DESC'
    );
    $stmt->execute([':u' => $user['id']]);
    $rows = $stmt->fetchAll();

    $tokens = array_map(static fn(array $r): array => [
        // Only show a short prefix of the token — full value was returned at mint time.
        'token_prefix' => substr((string) $r['token'], 0, 8),
        'label'        => $r['label'] !== null ? (string) $r['label'] : null,
        'platform'     => $r['platform'] !== null ? (string) $r['platform'] : null,
        'created_at'   => (string) $r['created_at'],
        'last_seen'    => $r['last_seen'] !== null ? (string) $r['last_seen'] : null,
        'revoked_at'   => $r['revoked_at'] !== null ? (string) $r['revoked_at'] : null,
    ], $rows);

    send_ok(['device_tokens' => $tokens]);
}

if ($method === 'POST') {
    $body     = read_json_body();
    $label    = trim((string) ($body['label'] ?? ''));
    $platform = trim((string) ($body['platform'] ?? ''));
    if ($label === '')    $label    = null;
    if ($platform === '') $platform = null;

    if ($label !== null && mb_strlen($label) > 120) {
        send_error('invalid_label', 'Label too long', 422);
    }
    if ($platform !== null && mb_strlen($platform) > 32) {
        send_error('invalid_platform', 'Platform too long', 422);
    }

    $token = mint_device_token($pdo, (int) $user['id'], $label, $platform);

    send_ok([
        'token'      => $token,
        'label'      => $label,
        'platform'   => $platform,
        'created_at' => ij_now_iso(),
    ], 201);
}

if ($method === 'DELETE') {
    // Revoke by prefix (since we never return the full token to clients again).
    $prefix = (string) ($_GET['prefix'] ?? '');
    if (!preg_match('/^[a-f0-9]{4,64}$/', $prefix)) {
        send_error('invalid_prefix', 'Provide the 8+ char token prefix', 422);
    }
    $upd = $pdo->prepare(
        'UPDATE device_tokens
            SET revoked_at = :r
          WHERE user_id = :u
            AND token LIKE :lk
            AND revoked_at IS NULL'
    );
    $upd->execute([
        ':r'  => ij_now_iso(),
        ':u'  => $user['id'],
        ':lk' => $prefix . '%',
    ]);
    if ($upd->rowCount() === 0) {
        send_error('not_found', 'No matching active token', 404);
    }
    http_response_code(204);
    exit;
}

send_error('method_not_allowed', "Method $method not allowed", 405);
