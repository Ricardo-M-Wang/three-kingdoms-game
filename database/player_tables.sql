-- Player tables for three-kingdoms-game multi-player support
-- Run after san_kingdoms_db.sql (reference data)

USE san_kingdoms;

CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  gold INT NOT NULL DEFAULT 2000,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_generals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  general_id VARCHAR(30) NOT NULL,
  advancement INT NOT NULL DEFAULT 0 CHECK (advancement >= 0 AND advancement <= 5),
  UNIQUE KEY uk_player_general (player_id, general_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  skill_id VARCHAR(50) NOT NULL,
  UNIQUE KEY uk_player_skill (player_id, skill_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
