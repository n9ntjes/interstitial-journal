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

$pdo = db();

$total_stmt = $pdo->prepare('SELECT COUNT(*) FROM entries WHERE user_id = :uid');
$total_stmt->execute([':uid' => $user['id']]);
$total = (int) $total_stmt->fetchColumn();

/**
 * Volume, active-day average, and peak hour for local days in [fromKey, toKey].
 *
 * @param list<array{created_at: string}> $rows
 * @return array{volume: int, activeDays: int, dailyAverage: float, peakHourLabel: string|null}
 */
function ij_scope_stats_bucket(array $rows, DateTimeZone $tz, string $from_key, string $to_key): array
{
    $per_day  = [];
    $per_hour = [];
    foreach ($rows as $r) {
        try {
            $dt = new DateTimeImmutable((string) $r['created_at']);
        } catch (Throwable) {
            continue;
        }
        $local = $dt->setTimezone($tz);
        $day   = $local->format('Y-m-d');
        if ($day < $from_key || $day > $to_key) {
            continue;
        }
        $hour = (int) $local->format('G');
        $per_day[$day]   = ($per_day[$day] ?? 0) + 1;
        $per_hour[$hour] = ($per_hour[$hour] ?? 0) + 1;
    }
    $volume = 0;
    foreach ($per_day as $c) {
        $volume += $c;
    }
    $active_days     = count($per_day);
    $daily_average   = $active_days > 0 ? round($volume / $active_days, 1) : 0.0;
    $most_hour       = null;
    $most_n          = -1;
    foreach ($per_hour as $h => $n) {
        if ($n > $most_n) {
            $most_n    = $n;
            $most_hour = (int) $h;
        }
    }
    $peak_label = $most_hour !== null && $most_n > 0
        ? sprintf('%02d–%02d', $most_hour, ($most_hour + 1) % 24)
        : null;

    return [
        'volume'        => $volume,
        'activeDays'    => $active_days,
        'dailyAverage'  => $daily_average,
        'peakHourLabel' => $peak_label,
    ];
}

// Build a lookup of entries grouped by the user's local day.
$rows_stmt = $pdo->prepare('SELECT created_at FROM entries WHERE user_id = :uid');
$rows_stmt->execute([':uid' => $user['id']]);
$rows = $rows_stmt->fetchAll();

$per_day  = [];   // dayKey (Y-m-d in tz) → count
$per_hour = [];   // hour (0-23 in tz)   → count

foreach ($rows as $r) {
    try {
        $dt = new DateTimeImmutable((string) $r['created_at']);
    } catch (Throwable) {
        continue;
    }
    $local = $dt->setTimezone($tz);
    $day   = $local->format('Y-m-d');
    $hour  = (int) $local->format('G');
    $per_day[$day]   = ($per_day[$day] ?? 0) + 1;
    $per_hour[$hour] = ($per_hour[$hour] ?? 0) + 1;
}

$today_dt       = new DateTimeImmutable('now', $tz);
$today_key      = $today_dt->format('Y-m-d');
$today_count    = $per_day[$today_key] ?? 0;
$week_from_key  = $today_dt->modify('-6 days')->format('Y-m-d');
$month_from_key = $today_dt->modify('first day of this month')->format('Y-m-d');

$scope_week  = ij_scope_stats_bucket($rows, $tz, $week_from_key, $today_key);
$scope_month = ij_scope_stats_bucket($rows, $tz, $month_from_key, $today_key);
$year_from   = $today_dt->modify('first day of january this year')->format('Y-m-d');
$scope_year  = ij_scope_stats_bucket($rows, $tz, $year_from, $today_key);

// This week = last 7 days including today.
$week_count = 0;
for ($i = 0; $i < 7; $i++) {
    $key = $today_dt->modify("-$i day")->format('Y-m-d');
    $week_count += $per_day[$key] ?? 0;
}

// Daily average across days with ≥1 entry (matches v1 behaviour: active-day avg).
$active_days   = count($per_day);
$daily_average = $active_days > 0 ? round($total / $active_days, 1) : 0.0;

// Current streak: start today if today has ≥1 entry, else yesterday.
$cursor = isset($per_day[$today_key]) ? $today_dt : $today_dt->modify('-1 day');
$current_streak = 0;
while (isset($per_day[$cursor->format('Y-m-d')])) {
    $current_streak++;
    $cursor = $cursor->modify('-1 day');
}

// Longest streak: walk sorted days.
$days_sorted = array_keys($per_day);
sort($days_sorted);
$longest = 0;
$run     = 0;
$prev    = null;
foreach ($days_sorted as $d) {
    if ($prev !== null) {
        $diff = (new DateTimeImmutable($prev))
            ->diff(new DateTimeImmutable($d))
            ->days;
        $run = $diff === 1 ? $run + 1 : 1;
    } else {
        $run = 1;
    }
    if ($run > $longest) $longest = $run;
    $prev = $d;
}

// Most active hour.
$most_hour = null;
$most_n    = -1;
foreach ($per_hour as $h => $n) {
    if ($n > $most_n) {
        $most_n  = $n;
        $most_hour = $h;
    }
}
$most_hour_label = $most_hour !== null
    ? sprintf('%02d–%02d', $most_hour, ($most_hour + 1) % 24)
    : null;

// Distinct tags + top tags (scoped to this user via the owning entry).
$dt_stmt = $pdo->prepare(
    'SELECT COUNT(DISTINCT et.tag)
       FROM entry_tags et
       INNER JOIN entries e ON e.id = et.entry_id
       WHERE e.user_id = :uid'
);
$dt_stmt->execute([':uid' => $user['id']]);
$distinct_tags = (int) $dt_stmt->fetchColumn();

$top_stmt = $pdo->prepare(
    'SELECT et.tag, COUNT(*) AS c
       FROM entry_tags et
       INNER JOIN entries e ON e.id = et.entry_id
       WHERE e.user_id = :uid
       GROUP BY et.tag
       ORDER BY c DESC, et.tag ASC
       LIMIT 8'
);
$top_stmt->execute([':uid' => $user['id']]);
$top = $top_stmt->fetchAll();
$top_tags = array_map(static fn(array $r): array => [
    'tag'   => (string) $r['tag'],
    'count' => (int) $r['c'],
], $top);

$punches_by_hour = array_fill(0, 24, 0);
foreach ($per_hour as $h => $n) {
    $hi = (int) $h;
    if ($hi >= 0 && $hi <= 23) {
        $punches_by_hour[$hi] = (int) $n;
    }
}

send_ok([
    'total'          => $total,
    'today'          => $today_count,
    'thisWeek'       => $week_count,
    'dailyAverage'   => $daily_average,
    'currentStreak'  => $current_streak,
    'longestStreak'  => $longest,
    'mostActiveHour' => $most_hour_label,
    'punchesByHour'  => $punches_by_hour,
    'distinctTags'   => $distinct_tags,
    'topTags'        => $top_tags,
    'scopes'         => [
        'week'  => $scope_week,
        'month' => $scope_month,
        'year'  => $scope_year,
    ],
]);
