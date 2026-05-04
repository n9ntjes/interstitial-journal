<?php
declare(strict_types=1);

/**
 * Tag parser — matches the client-side grammar in src/lib/tagParser.ts.
 *
 *   /work        → "work"
 *   /dev-ops     → "dev-ops"
 *   /1hour       → ∅   (must start with a letter)
 *   /work!       → "work"
 *   not/atag     → ∅   (must follow whitespace or start-of-string)
 */
function parse_tags(string $content): array {
    if ($content === '') return [];

    $pattern = '/(?<=^|\s)\/([a-zA-Z][a-zA-Z0-9\-_]*)/u';
    if (!preg_match_all($pattern, $content, $matches)) {
        return [];
    }

    $seen = [];
    $out  = [];
    foreach ($matches[1] as $raw) {
        $tag = mb_strtolower($raw);
        if (isset($seen[$tag])) continue;
        $seen[$tag] = true;
        $out[] = $tag;
    }
    return $out;
}

function sync_entry_tags(PDO $pdo, int $entry_id, string $content): array {
    $tags = parse_tags($content);

    $del = $pdo->prepare('DELETE FROM entry_tags WHERE entry_id = :id');
    $del->execute([':id' => $entry_id]);

    if ($tags === []) return [];

    $ins = $pdo->prepare('INSERT IGNORE INTO entry_tags (entry_id, tag) VALUES (:id, :tag)');
    foreach ($tags as $tag) {
        $ins->execute([':id' => $entry_id, ':tag' => $tag]);
    }
    return $tags;
}

function load_entry_tags(PDO $pdo, int $entry_id): array {
    $stmt = $pdo->prepare('SELECT tag FROM entry_tags WHERE entry_id = :id ORDER BY tag ASC');
    $stmt->execute([':id' => $entry_id]);
    return array_map(static fn(array $r): string => (string) $r['tag'], $stmt->fetchAll());
}

function load_tags_for_entries(PDO $pdo, array $entry_ids): array {
    if ($entry_ids === []) return [];
    $place = implode(',', array_fill(0, count($entry_ids), '?'));
    $stmt  = $pdo->prepare("SELECT entry_id, tag FROM entry_tags WHERE entry_id IN ($place) ORDER BY tag ASC");
    $stmt->execute($entry_ids);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[(int) $row['entry_id']][] = (string) $row['tag'];
    }
    return $map;
}
