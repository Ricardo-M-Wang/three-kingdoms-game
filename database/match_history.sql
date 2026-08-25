USE san_kingdoms;

CREATE TABLE IF NOT EXISTS match_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player1_id INT NOT NULL,
  player2_id INT NOT NULL,
  winner_id INT,
  score VARCHAR(10) NOT NULL DEFAULT '',
  rewards_given TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES players(id),
  FOREIGN KEY (player2_id) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
