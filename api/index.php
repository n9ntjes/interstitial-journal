<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

send_error(
    'not_found',
    'No endpoint at this path. Try /api/health.php or /api/entries.php',
    404
);
