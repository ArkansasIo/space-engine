-- ============================================================================
-- AstroSim — seed data (MySQL 8)
-- ----------------------------------------------------------------------------
-- Run AFTER schema.sql.  Idempotent: re-running replaces the built-in presets,
-- demo users and demo simulations (all keyed and deleted first).
--
-- Demo password for every seeded account: "Password123!"
-- (bcrypt hash with cost 10 — change immediately in any real deployment.)
-- ============================================================================

USE `astrosim`;

-- ---------------------------------------------------------------------------
-- Built-in presets
-- ---------------------------------------------------------------------------
DELETE FROM `presets` WHERE `is_builtin` = 1;

INSERT INTO `presets`
  (`key`, `name`, `category`, `description`, `difficulty`, `settings`, `is_builtin`, `sort_order`)
VALUES
  ('empty', 'Empty Sandbox', 'sandbox',
   'A blank canvas — spawn whatever you like.',
   1,
   JSON_OBJECT(
     'bodies', JSON_ARRAY(),
     'gravity', JSON_OBJECT('G', 1, 'softening', 4, 'relativistic', false),
     'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 1)
   ),
   1, 10),

  ('binary-stars', 'Binary Stars', 'stellar',
   'Two equal stars locked in a mutual orbit. A classic two-body test.',
   2,
   JSON_OBJECT(
     'bodies', JSON_ARRAY(
       JSON_OBJECT('name','Primary','kind','star','mass',1200,'radius',16,
                   'x',-140,'y',0,'vx',0.9,'vy',0,'color','#ffd479','temperature',5800,'luminosity',1.4),
       JSON_OBJECT('name','Secondary','kind','star','mass',1200,'radius',16,
                   'x',140,'y',0,'vx',-0.9,'vy',0,'color','#ffb347','temperature',5400,'luminosity',1.1)
     ),
     'gravity', JSON_OBJECT('G', 1, 'softening', 4, 'relativistic', false),
     'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 1)
   ),
   1, 20),

  ('solar-system-lite', 'Solar System (Lite)', 'orbital',
   'A heavy central star with a handful of planets on near-circular orbits.',
   2,
   JSON_OBJECT(
     'bodies', JSON_ARRAY(
       JSON_OBJECT('name','Sol','kind','star','mass',90000,'radius',34,
                   'x',0,'y',0,'vx',0,'vy',0,'color','#fff2b8','temperature',5778,'luminosity',1,'fixed',true),
       JSON_OBJECT('name','Mercury','kind','planet','mass',12,'radius',6,
                   'x',220,'y',0,'vx',0,'vy',-7.1,'color','#b8b0a4'),
       JSON_OBJECT('name','Venus','kind','planet','mass',26,'radius',9,
                   'x',330,'y',0,'vx',0,'vy',-5.8,'color','#e6c88a'),
       JSON_OBJECT('name','Earth','kind','planet','mass',30,'radius',10,
                   'x',450,'y',0,'vx',0,'vy',-4.9,'color','#5aa7e6'),
       JSON_OBJECT('name','Mars','kind','planet','mass',18,'radius',7,
                   'x',600,'y',0,'vx',0,'vy',-4.2,'color','#d9694a')
     ),
     'gravity', JSON_OBJECT('G', 1, 'softening', 6, 'relativistic', false),
     'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 0.75)
   ),
   1, 30),

  ('black-hole', 'Lone Black Hole', 'blackhole',
   'A single Schwarzschild black hole. Watch how nearby light bends.',
   3,
   JSON_OBJECT(
     'bodies', JSON_ARRAY(
       JSON_OBJECT('name','Singularity','kind','blackhole','mass',260000,'radius',22,
                   'x',0,'y',0,'vx',0,'vy',0,'color','#8a2be2','spin',0.7)
     ),
     'gravity', JSON_OBJECT('G', 1, 'softening', 2, 'relativistic', true),
     'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 1)
   ),
   1, 40),

  ('accretion', 'Accretion Disk', 'blackhole',
   'A black hole with an infalling ring of dust on eccentric orbits.',
   4,
   JSON_OBJECT(
     'bodies', JSON_ARRAY(
       JSON_OBJECT('name','Singularity','kind','blackhole','mass',300000,'radius',24,
                   'x',0,'y',0,'vx',0,'vy',0,'color','#ff6b35','spin',0.9),
       JSON_OBJECT('name','dust-0','kind','dust','mass',1,'radius',3,'x',180,'y',40,  'vx',0,'vy',-3.2,'color','#ffcf6b'),
       JSON_OBJECT('name','dust-1','kind','dust','mass',1,'radius',3,'x',140,'y',-120,'vx',2.6,'vy',0,'color','#ffd479'),
       JSON_OBJECT('name','dust-2','kind','dust','mass',1,'radius',3,'x',-170,'y',90, 'vx',0,'vy',3.6,'color','#ffb347'),
       JSON_OBJECT('name','dust-3','kind','dust','mass',1,'radius',3,'x',-130,'y',-150,'vx',-3.0,'vy',0,'color','#ffe0a3')
     ),
     'gravity', JSON_OBJECT('G', 1, 'softening', 3, 'relativistic', true),
     'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 1)
   ),
   1, 50),

  ('neutron-binary', 'Neutron Star Binary', 'exotic',
   'Two ultra-dense neutron stars spiralling toward merger.',
   5,
   JSON_OBJECT(
     'bodies', JSON_ARRAY(
       JSON_OBJECT('name','Pulsar-A','kind','neutron','mass',42000,'radius',9,
                   'x',-70,'y',0,'vx',0,'vy',4.4,'color','#cfe8ff','luminosity',0.4),
       JSON_OBJECT('name','Pulsar-B','kind','neutron','mass',40000,'radius',9,
                   'x',70,'y',0,'vx',0,'vy',-4.6,'color','#9ecbff','luminosity',0.4)
     ),
     'gravity', JSON_OBJECT('G', 1, 'softening', 2, 'relativistic', true),
     'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 1)
   ),
   1, 60);

-- ---------------------------------------------------------------------------
-- Demo users
-- ---------------------------------------------------------------------------
DELETE FROM `users` WHERE `username` IN ('admin', 'demo');

INSERT INTO `users`
  (`username`, `email`, `password_hash`, `display_name`, `role`, `is_active`)
VALUES
  ('admin', 'admin@astrosim.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Administrator', 'admin', 1),
  ('demo', 'demo@astrosim.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Demo User', 'user', 1);

-- ---------------------------------------------------------------------------
-- Demo simulations (+ their normalised bodies)
-- ---------------------------------------------------------------------------
DELETE FROM `simulations`
 WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `username` IN ('admin', 'demo'));

INSERT INTO `simulations`
  (`user_id`, `name`, `description`, `preset_key`, `body_count`, `seed`, `settings`, `is_public`, `play_count`)
SELECT u.`id`, col.name, col.description,
       col.preset_key, col.body_count, col.seed, col.settings,
       col.is_public, col.play_count
FROM `users` u
JOIN (
  SELECT 'Welcome Binary' AS name, 'Auto-generated demo of two orbiting stars.' AS description,
         'binary-stars' AS preset_key, 2 AS body_count, 424242 AS seed,
         JSON_OBJECT(
           'bodies', JSON_ARRAY(
             JSON_OBJECT('name','Primary','kind','star','mass',1200,'radius',16,
                         'x',-140,'y',0,'vx',0.9,'vy',0,'color','#ffd479','temperature',5800,'luminosity',1.4),
             JSON_OBJECT('name','Secondary','kind','star','mass',1200,'radius',16,
                         'x',140,'y',0,'vx',-0.9,'vy',0,'color','#ffb347','temperature',5400,'luminosity',1.1)
           ),
           'gravity', JSON_OBJECT('G', 1, 'softening', 4, 'relativistic', false),
           'camera',  JSON_OBJECT('x', 0, 'y', 0, 'zoom', 1)
         ) AS settings,
         1 AS is_public, 12 AS play_count
) col
WHERE u.`username` = 'demo';

INSERT INTO `bodies`
  (`simulation_id`, `name`, `kind`, `mass`, `radius`, `pos_x`, `pos_y`, `vel_x`, `vel_y`,
   `color`, `temperature`, `luminosity`, `spin`, `is_fixed`, `trail_length`)
SELECT s.`id`, 'Primary', 'star', 1200, 16, -140, 0, 0.9, 0,
       '#ffd479', 5800, 1.4, 0, 0, 240
  FROM `simulations` s WHERE s.`name` = 'Welcome Binary'
  UNION ALL
SELECT s.`id`, 'Secondary', 'star', 1200, 16, 140, 0, -0.9, 0,
       '#ffb347', 5400, 1.1, 0, 0, 240
  FROM `simulations` s WHERE s.`name` = 'Welcome Binary';

-- ---------------------------------------------------------------------------
-- Demo experiment
-- ---------------------------------------------------------------------------
DELETE FROM `experiments`
 WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `username` = 'demo');

INSERT INTO `experiments`
  (`simulation_id`, `user_id`, `label`, `integral_value`, `derivative_at`, `energy_drift`, `samples`, `result`)
SELECT s.`id`, s.`user_id`, 'Orbital energy check',
       1.0000e0, -2.4e-3, 5.1e-6, 2048,
       JSON_OBJECT('note','Demo measurement', 'unit','dimensionless')
  FROM `simulations` s WHERE s.`name` = 'Welcome Binary';

-- ---------------------------------------------------------------------------
-- Record migrations that schema.sql effectively applies
-- ---------------------------------------------------------------------------
INSERT INTO `schema_migrations` (`filename`, `checksum`)
VALUES ('001_init.sql', REPEAT('0', 64))
ON DUPLICATE KEY UPDATE `checksum` = VALUES(`checksum`);
