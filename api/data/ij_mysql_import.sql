-- Interstitial Journal MySQL import
-- Generated at 2026-04-23T07:26:23Z

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

CREATE TABLE IF NOT EXISTS entries (
            id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            created_at VARCHAR(32)     NOT NULL,
            content    MEDIUMTEXT      NOT NULL,
            source     VARCHAR(16)     NOT NULL DEFAULT 'api',
            updated_at VARCHAR(32)     NOT NULL,
            PRIMARY KEY (id),
            KEY idx_entries_created_at (created_at, id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entry_tags (
            entry_id BIGINT UNSIGNED NOT NULL,
            tag      VARCHAR(64)     NOT NULL,
            PRIMARY KEY (entry_id, tag),
            KEY idx_entry_tags_tag (tag),
            CONSTRAINT fk_entry_tags_entry
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entry_images (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            entry_id        BIGINT UNSIGNED NULL,
            mime            VARCHAR(64)     NOT NULL,
            width           INT             NULL,
            height          INT             NULL,
            created_at      VARCHAR(32)     NOT NULL,
            storage_relpath VARCHAR(255)    NULL,
            PRIMARY KEY (id),
            KEY idx_entry_images_entry (entry_id),
            CONSTRAINT fk_entry_images_entry
                FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `entries` (`id`, `created_at`, `content`, `source`, `updated_at`) VALUES
  (1, '2026-04-20T18:17:00Z', 'first punch from curl', 'api', '2026-04-20T18:17:00Z'),
  (2, '2026-04-20T18:24:35.903Z', 'Hello Seamen', 'tauri', '2026-04-20T18:24:35.903Z'),
  (3, '2026-04-20T18:52:12.183Z', 'Hello World!', 'tauri', '2026-04-20T18:52:12.183Z'),
  (4, '2026-04-20T18:53:30.461Z', 'punch', 'web', '2026-04-20T18:53:30.461Z'),
  (5, '2026-04-20T18:55:23.659Z', 'Hey', 'tauri', '2026-04-20T18:55:23.659Z'),
  (6, '2026-04-20T18:55:33.037Z', 'Punch', 'tauri', '2026-04-20T18:55:33.037Z'),
  (7, '2026-04-20T18:55:48.618Z', 'Manic in america', 'tauri', '2026-04-20T18:55:48.618Z'),
  (8, '2026-04-21T09:07:15.585Z', 'Hello seamen!', 'tauri', '2026-04-21T09:07:15.585Z'),
  (9, '2026-04-21T09:08:05.278Z', 'Hey!', 'tauri', '2026-04-21T09:08:05.278Z'),
  (10, '2026-04-21T22:14:49.290Z', 'Hello Seamen!', 'web', '2026-04-21T22:14:49.290Z'),
  (11, '2026-04-21T22:16:49.681Z', 'Hello Seamen!', 'web', '2026-04-21T22:16:49.681Z'),
  (13, '2026-04-21T22:19:33.945Z', 'Hello world 2', 'tauri', '2026-04-21T22:19:33.945Z'),
  (14, '2026-04-21T22:44:13.105Z', 'Daisy een demo laten zien', 'tauri', '2026-04-21T22:44:13.105Z'),
  (15, '2026-04-21T23:58:36.198Z', 'Make out with my choppa', 'tauri', '2026-04-21T23:58:36.198Z'),
  (16, '2026-04-22T00:10:50.008Z', 'Flip', 'tauri', '2026-04-22T00:10:50.008Z'),
  (17, '2026-04-22T00:11:06.660Z', 'Test #1', 'tauri', '2026-04-22T00:11:06.660Z'),
  (18, '2026-04-22T00:17:42.340Z', 'This is an entry with multiple images', 'tauri', '2026-04-22T00:17:42.340Z'),
  (19, '2026-04-22T00:18:00.931Z', 'Wassup', 'tauri', '2026-04-22T00:18:00.931Z'),
  (20, '2026-04-22T00:26:54.154Z', 'If looks could kill, baby i\'m the fashion demon', 'tauri', '2026-04-22T00:26:54.154Z'),
  (21, '2026-04-22T00:40:42.405Z', '/music ik luister nu nine vicious', 'tauri', '2026-04-22T00:40:42.405Z'),
  (22, '2026-04-22T00:48:47.683Z', 'Bitch im a monster of molly', 'tauri', '2026-04-22T00:48:47.683Z'),
  (23, '2026-04-22T00:50:31.083Z', '/programming polling added', 'tauri', '2026-04-22T00:50:31.083Z'),
  (24, '2026-04-22T00:57:47.465Z', 'Make out with my choppa', 'web', '2026-04-22T00:57:47.465Z'),
  (25, '2026-04-22T01:33:59.843Z', 'Watching some shit rn', 'tauri', '2026-04-22T01:33:59.843Z');

INSERT INTO `entry_tags` (`entry_id`, `tag`) VALUES
  (21, 'music'),
  (23, 'programming');

INSERT INTO `entry_images` (`id`, `entry_id`, `mime`, `width`, `height`, `created_at`, `storage_relpath`) VALUES
  (1, 15, 'image/png', 1920, 1080, '2026-04-21 23:58:36', '1.png'),
  (2, 16, 'image/png', 1920, 1080, '2026-04-22 00:10:50', '2.png'),
  (3, 17, 'image/png', 1920, 1080, '2026-04-22 00:11:06', '3.png'),
  (4, 18, 'image/png', 1920, 1080, '2026-04-22 00:17:42', '4.png'),
  (5, 18, 'image/png', 1920, 1080, '2026-04-22 00:17:42', '5.png'),
  (6, 18, 'image/png', 1920, 1080, '2026-04-22 00:17:42', '6.png'),
  (7, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '7.png'),
  (8, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '8.png'),
  (9, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '9.png'),
  (10, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '10.png'),
  (11, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '11.png'),
  (12, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '12.png'),
  (13, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '13.png'),
  (14, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '14.png'),
  (15, 19, 'image/png', 1920, 1080, '2026-04-22 00:18:00', '15.png'),
  (16, 20, 'image/png', 1920, 1080, '2026-04-22 00:26:54', '16.png'),
  (17, 20, 'image/png', 1920, 1080, '2026-04-22 00:26:54', '17.png'),
  (18, 25, 'image/png', 1920, 1080, '2026-04-22 01:33:59', '18.png');

ALTER TABLE `entries` AUTO_INCREMENT = 26;
ALTER TABLE `entry_images` AUTO_INCREMENT = 19;

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
