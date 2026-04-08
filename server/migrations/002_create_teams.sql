CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  access_code VARCHAR(20) UNIQUE NOT NULL,  -- ABCD1234 等
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- usersテーブルにteam_idの外部キー制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_team'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_team
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;
