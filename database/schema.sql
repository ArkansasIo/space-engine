-- ============================================================================
-- AstroSim — MySQL 8 schema
-- ----------------------------------------------------------------------------
-- Run order:  schema.sql  ->  seed.sql
-- All tables use InnoDB + utf8mb4 so JSON documents and emoji-safe names work.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `astrosim`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `astrosim`;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(32)     NOT NULL,
  `email`           VARCHAR(190)    NOT NULL,
  `password_hash`   VARCHAR(72)     NOT NULL,
  `display_name`    VARCHAR(64)         NULL,
  `role`            ENUM('user','admin') NOT NULL DEFAULT 'user',
  `is_active`       TINYINT(1)      NOT NULL DEFAULT 1,
  `last_login_at`   DATETIME            NULL,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`),
  KEY `ix_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- simulations — one saved scene: a set of bodies + global settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `simulations` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `name`            VARCHAR(120)    NOT NULL,
  `description`     VARCHAR(500)        NULL,
  `preset_key`      VARCHAR(60)         NULL,
  `body_count`      INT UNSIGNED    NOT NULL DEFAULT 0,
  `seed`            BIGINT UNSIGNED     NULL,
  -- full serialised scene (bodies, gravity settings, camera, renderer flags)
  `settings`        JSON            NOT NULL,
  `is_public`       TINYINT(1)      NOT NULL DEFAULT 0,
  `is_archived`     TINYINT(1)      NOT NULL DEFAULT 0,
  `play_count`      INT UNSIGNED    NOT NULL DEFAULT 0,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_sim_user`    (`user_id`),
  KEY `ix_sim_public`  (`is_public`, `is_archived`),
  KEY `ix_sim_preset`  (`preset_key`),
  FULLTEXT KEY `ft_sim_name` (`name`, `description`),
  CONSTRAINT `fk_sim_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- bodies — normalised mirror of the scene's objects.
-- `simulations.settings` holds the authoritative JSON blob; this table exists
-- so users can query/aggregate across simulations (e.g. "all black holes").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bodies` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `simulation_id`   BIGINT UNSIGNED NOT NULL,
  `name`            VARCHAR(80)     NOT NULL,
  `kind`            ENUM('star','planet','blackhole','neutron','dust','ship')
                                    NOT NULL DEFAULT 'planet',
  `mass`            DOUBLE          NOT NULL DEFAULT 1,
  `radius`          DOUBLE          NOT NULL DEFAULT 6,
  `pos_x`           DOUBLE          NOT NULL DEFAULT 0,
  `pos_y`           DOUBLE          NOT NULL DEFAULT 0,
  `vel_x`           DOUBLE          NOT NULL DEFAULT 0,
  `vel_y`           DOUBLE          NOT NULL DEFAULT 0,
  `color`           CHAR(7)         NOT NULL DEFAULT '#ffcf6b',
  `temperature`     DOUBLE          NOT NULL DEFAULT 0,
  `luminosity`      DOUBLE          NOT NULL DEFAULT 0,
  `spin`            DOUBLE          NOT NULL DEFAULT 0,
  `is_fixed`        TINYINT(1)      NOT NULL DEFAULT 0,
  `trail_length`    INT UNSIGNED    NOT NULL DEFAULT 240,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_bodies_sim`  (`simulation_id`),
  KEY `ix_bodies_kind` (`kind`),
  CONSTRAINT `fk_bodies_sim`
    FOREIGN KEY (`simulation_id`) REFERENCES `simulations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- presets — built-in + user scenes, seeded at install time
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `presets` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`             VARCHAR(60)     NOT NULL,
  `name`            VARCHAR(120)    NOT NULL,
  `category`        ENUM('blackhole','stellar','orbital','exotic','sandbox')
                                    NOT NULL DEFAULT 'sandbox',
  `description`     VARCHAR(500)        NULL,
  `difficulty`      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `settings`        JSON            NOT NULL,
  `is_builtin`      TINYINT(1)      NOT NULL DEFAULT 1,
  `sort_order`      INT             NOT NULL DEFAULT 0,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_presets_key` (`key`),
  KEY `ix_presets_cat` (`category`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- experiments — quantitative runs (measurements, fitted parameters)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `experiments` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `simulation_id`   BIGINT UNSIGNED     NULL,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `label`           VARCHAR(120)    NOT NULL,
  `integral_value`  DOUBLE              NULL,
  `derivative_at`   DOUBLE              NULL,
  `energy_drift`    DOUBLE              NULL,
  `samples`         INT UNSIGNED    NOT NULL DEFAULT 0,
  `result`          JSON                NULL,
  `measured_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_exp_sim`  (`simulation_id`),
  KEY `ix_exp_user` (`user_id`),
  CONSTRAINT `fk_exp_sim`
    FOREIGN KEY (`simulation_id`) REFERENCES `simulations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_exp_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- api_events — lightweight audit/telemetry trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_events` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED     NULL,
  `event_type`      VARCHAR(48)     NOT NULL,
  `entity`          VARCHAR(48)         NULL,
  `entity_id`       BIGINT UNSIGNED     NULL,
  `detail`          JSON                NULL,
  `ip_address`      VARCHAR(45)         NULL,
  `user_agent`      VARCHAR(255)        NULL,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_events_type` (`event_type`, `created_at`),
  KEY `ix_events_user` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- schema_migrations — applied migration bookkeeping
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id`              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `filename`        VARCHAR(190)    NOT NULL,
  `checksum`        CHAR(64)        NOT NULL,
  `applied_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_migrations_filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Convenience view: simulation summary with owner + kind counts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_simulation_summary` AS
SELECT
  s.`id`,
  s.`name`,
  s.`preset_key`,
  s.`body_count`,
  s.`is_public`,
  s.`created_at`,
  s.`updated_at`,
  u.`username` AS owner,
  COALESCE(b.holes, 0)  AS black_holes,
  COALESCE(b.stars, 0)  AS stars,
  COALESCE(b.planets,0) AS planets
FROM `simulations` s
JOIN `users` u ON u.`id` = s.`user_id`
LEFT JOIN (
  SELECT
    `simulation_id`,
    SUM(`kind` = 'blackhole') AS holes,
    SUM(`kind` = 'star')      AS stars,
    SUM(`kind` IN ('planet','dust','ship','neutron')) AS planets
  FROM `bodies`
  GROUP BY `simulation_id`
) b ON b.`simulation_id` = s.`id`;
