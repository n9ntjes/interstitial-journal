<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    send_error('method_not_allowed', 'POST only', 405);
}

$body         = read_json_body();
$email        = trim((string) ($body['email'] ?? ''));
$password     = (string) ($body['password'] ?? '');
$display_name = trim((string) ($body['display_name'] ?? ''));

if (!validate_email($email)) {
    send_error('invalid_email', 'Enter a valid email address', 422);
}
if (mb_strlen($password) < 8) {
    send_error('weak_password', 'Password must be at least 8 characters', 422);
}
if (mb_strlen($password) > 200) {
    send_error('weak_password', 'Password too long', 422);
}
if ($display_name !== '' && mb_strlen($display_name) > 120) {
    send_error('invalid_display_name', 'Display name too long', 422);
}

$pdo = db();

// Case-insensitive email dedupe; unique key already enforces this server-side.
$email_lc = mb_strtolower($email);

$check = $pdo->prepare('SELECT 1 FROM users WHERE email = :e');
$check->execute([':e' => $email_lc]);
if ($check->fetchColumn() !== false) {
    send_error('email_taken', 'An account with that email already exists', 409);
}

$hash = password_hash($password, PASSWORD_BCRYPT);
if ($hash === false) {
    send_error('internal_error', 'Could not hash password', 500);
}

$ins = $pdo->prepare(
    'INSERT INTO users (email, password_hash, display_name, created_at)
     VALUES (:e, :h, :n, :c)'
);
$ins->execute([
    ':e' => $email_lc,
    ':h' => $hash,
    ':n' => $display_name !== '' ? $display_name : null,
    ':c' => ij_now_iso(),
]);
$user_id = (int) $pdo->lastInsertId();

$token = create_session($pdo, $user_id, 'web');
set_session_cookie($token);

send_ok([
    'user' => [
        'id'           => $user_id,
        'email'        => $email_lc,
        'display_name' => $display_name !== '' ? $display_name : null,
        'created_at'   => ij_now_iso(),
    ],
    'expires_at' => ij_future_iso(IJ_SESSION_TTL),
], 201);
