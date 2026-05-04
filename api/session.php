<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/_db.php';
require __DIR__ . '/_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // whoami — optional (null when logged out); never 401.
    $auth = current_user();
    if ($auth === null) {
        send_ok(['user' => null]);
    }
    send_ok([
        'user' => public_user($auth['user']),
        'via'  => $auth['via'],
    ]);
}

if ($method === 'POST') {
    $body     = read_json_body();
    $email    = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        send_error('missing_credentials', 'Email and password are required', 422);
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, email, password_hash, display_name, created_at
           FROM users WHERE email = :e'
    );
    $stmt->execute([':e' => mb_strtolower($email)]);
    $user = $stmt->fetch();

    // Constant-time compare via password_verify; always run it even on
    // missing-user to avoid leaking email existence via timing.
    $hash = $user !== false ? (string) $user['password_hash'] : '$2y$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    $ok   = password_verify($password, $hash);
    if (!$user || !$ok) {
        send_error('invalid_credentials', 'Wrong email or password', 401);
    }

    $user_id = (int) $user['id'];
    $token   = create_session($pdo, $user_id, 'web');
    set_session_cookie($token);

    send_ok([
        'user' => public_user($user),
        'expires_at' => ij_future_iso(IJ_SESSION_TTL),
    ]);
}

if ($method === 'DELETE') {
    $pdo = db();
    $cookie = get_session_cookie_token();
    if ($cookie !== null) {
        $del = $pdo->prepare('DELETE FROM sessions WHERE token = :t');
        $del->execute([':t' => $cookie]);
    }
    clear_session_cookie();
    http_response_code(204);
    exit;
}

send_error('method_not_allowed', "Method $method not allowed", 405);
