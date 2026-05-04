<?php
declare(strict_types=1);

/**
 * Shared bootstrap for every endpoint in api/.
 *
 * Required at the top of each endpoint file. Sets CORS, establishes the
 * JSON response envelope {ok, data|error}, and registers a shutdown handler
 * that converts uncaught exceptions into a typed error response.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$allowed_origins = [
    'http://localhost:5173',    // web-app dev
    'http://localhost:1420',    // tauri-app dev
    'tauri://localhost',        // tauri production (macOS/Linux)
    'http://tauri.localhost',   // tauri production (Windows)
    'https://tauri.localhost',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Client');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function send_ok(mixed $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function send_error(string $code, string $message, int $status = 400, array $details = []): never {
    http_response_code($status);
    echo json_encode([
        'ok'    => false,
        'error' => [
            'code'    => $code,
            'message' => $message,
            'details' => (object) $details,
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        send_error('invalid_json', 'Request body is not valid JSON', 400);
    }
    return $decoded;
}

set_exception_handler(static function (Throwable $e): void {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => [
            'code'    => 'internal_error',
            'message' => $e->getMessage(),
            'details' => (object) [],
        ],
    ], JSON_UNESCAPED_UNICODE);
});
