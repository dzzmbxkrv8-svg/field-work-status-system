-- 013_create_password_reset_tokens.sql
-- メール認証式パスワードリセット用トークンテーブル

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  new_pw_hash  TEXT NOT NULL,       -- 事前にハッシュ済みの新パスワード
  expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,  -- 1時間で失効
  used_at      TIMESTAMP WITH TIME ZONE            -- NULL = 未使用
);

CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
