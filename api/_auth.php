<?php
declare(strict_types=1);

/**
 * Session + device-token auth.
 *
 * Two credential carriers:
 *   1. Web-app sends the `ij_session` cookie → looked up in `sessions`.
 *   2. Tauri-app sends `Authorization: Bearer <token>` → looked up in
 *      `device_tokens` (long-lived, baked into the installer the user
 *      downloaded while logged in).
 *
 * `require_user()` returns the user row and, by side-effect, touches
 * last_seen / extends the session expiry. Endpoints that need it call it
 * near the top; public endpoints (health, signup, login) don't.
 */

require_once __DIR__ . '/_db.php';

const IJ_SESSION_COOKIE = 'ij_session';
const IJ_SESSION_TTL    = 30 * 24 * 3600; // 30 days

function ij_now_iso(): string {
    return gmdate('Y-m-d\TH:i:s\Z');
}

function ij_future_iso(int $seconds_from_now): string {
    return gmdate('Y-m-d\TH:i:s\Z', time() + $seconds_from_now);
}

function ij_random_token(): string {
    return bin2hex(random_bytes(32));
}

function ij_cookie_params(): array {
    return [
        'expires'  => time() + IJ_SESSION_TTL,
        'path'     => '/',
        'domain'   => '',
        'secure'   => ($_SERVER['HTTPS'] ?? '') !== '' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

function set_session_cookie(string $token): void {
    setcookie(IJ_SESSION_COOKIE, $token, ij_cookie_params());
}

function clear_session_cookie(): void {
    $params = ij_cookie_params();
    $params['expires'] = time() - 3600;
    setcookie(IJ_SESSION_COOKIE, '', $params);
}

function get_bearer_token(): ?string {
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($hdr !== '' && preg_match('/^Bearer\s+([A-Za-z0-9]+)$/', $hdr, $m)) {
        return $m[1];
    }
    return null;
}

function get_session_cookie_token(): ?string {
    $t = $_COOKIE[IJ_SESSION_COOKIE] ?? null;
    if (!is_string($t)) return null;
    if (!preg_match('/^[a-f0-9]{64}$/', $t)) return null;
    return $t;
}

/**
 * Resolve the current actor. Order: Bearer device token, then cookie session.
 *
 * @return array{user: array, via: string, token: string}|null
 */
function current_user(): ?array {
    $pdo = db();

    $bearer = get_bearer_token();
    if ($bearer !== null && preg_match('/^[a-f0-9]{64}$/', $bearer)) {
        $stmt = $pdo->prepare(
            'SELECT d.token, d.user_id, u.id, u.email, u.display_name, u.created_at
               FROM device_tokens d
               INNER JOIN users u ON u.id = d.user_id
               WHERE d.token = :t AND d.revoked_at IS NULL'
        );
        $stmt->execute([':t' => $bearer]);
        $row = $stmt->fetch();
        if ($row !== false) {
            // Cheap heartbeat so the Settings page can show active clients.
            $touch = $pdo->prepare('UPDATE device_tokens SET last_seen = :now WHERE token = :t');
            $touch->execute([':now' => ij_now_iso(), ':t' => $bearer]);
            return [
                'user'  => [
                    'id'           => (int) $row['id'],
                    'email'        => (string) $row['email'],
                    'display_name' => $row['display_name'] !== null ? (string) $row['display_name'] : null,
                    'created_at'   => (string) $row['created_at'],
                ],
                'via'   => 'device',
                'token' => (string) $row['token'],
            ];
        }
    }

    $cookie = get_session_cookie_token();
    if ($cookie !== null) {
        $stmt = $pdo->prepare(
            'SELECT s.token, s.expires_at, u.id, u.email, u.display_name, u.created_at
               FROM sessions s
               INNER JOIN users u ON u.id = s.user_id
               WHERE s.token = :t'
        );
        $stmt->execute([':t' => $cookie]);
        $row = $stmt->fetch();
        if ($row !== false && (string) $row['expires_at'] > ij_now_iso()) {
            // Rolling expiry — a daily visit keeps the session alive.
            $upd = $pdo->prepare('UPDATE sessions SET expires_at = :e WHERE token = :t');
            $upd->execute([':e' => ij_future_iso(IJ_SESSION_TTL), ':t' => $cookie]);
            return [
                'user'  => [
                    'id'           => (int) $row['id'],
                    'email'        => (string) $row['email'],
                    'display_name' => $row['display_name'] !== null ? (string) $row['display_name'] : null,
                    'created_at'   => (string) $row['created_at'],
                ],
                'via'   => 'session',
                'token' => (string) $row['token'],
            ];
        }
    }

    return null;
}

/**
 * Demand an authenticated user or 401. Returns the user array.
 */
function require_user(): array {
    $auth = current_user();
    if ($auth === null) {
        send_error('unauthorized', 'Authentication required', 401);
    }
    return $auth['user'];
}

function require_auth_context(): array {
    $auth = current_user();
    if ($auth === null) {
        send_error('unauthorized', 'Authentication required', 401);
    }
    return $auth;
}

function validate_email(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false && mb_strlen($email) <= 255;
}

function create_session(PDO $pdo, int $user_id, string $source = 'web'): string {
    $token = ij_random_token();
    $stmt  = $pdo->prepare(
        'INSERT INTO sessions (token, user_id, created_at, expires_at, user_agent, source)
         VALUES (:t, :u, :c, :e, :ua, :s)'
    );
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (mb_strlen($ua) > 255) $ua = mb_substr($ua, 0, 255);
    $stmt->execute([
        ':t'  => $token,
        ':u'  => $user_id,
        ':c'  => ij_now_iso(),
        ':e'  => ij_future_iso(IJ_SESSION_TTL),
        ':ua' => $ua !== '' ? $ua : null,
        ':s'  => $source,
    ]);
    return $token;
}

function mint_device_token(PDO $pdo, int $user_id, ?string $label, ?string $platform): string {
    $token = ij_random_token();
    $stmt  = $pdo->prepare(
        'INSERT INTO device_tokens (token, user_id, label, platform, created_at)
         VALUES (:t, :u, :l, :p, :c)'
    );
    $stmt->execute([
        ':t' => $token,
        ':u' => $user_id,
        ':l' => $label,
        ':p' => $platform,
        ':c' => ij_now_iso(),
    ]);
    return $token;
}

function public_user(array $user): array {
    return [
        'id'           => (int) $user['id'],
        'email'        => (string) $user['email'],
        'display_name' => $user['display_name'] !== null ? (string) $user['display_name'] : null,
        'created_at'   => (string) $user['created_at'],
    ];
}
