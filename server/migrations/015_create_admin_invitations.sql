-- 015_create_admin_invitations.sql
-- 管理者の招待（メールリンクからパスワード設定で参加）

CREATE TABLE IF NOT EXISTS admin_invitations (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       VARCHAR(100) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  furigana    VARCHAR(100),
  token       TEXT NOT NULL UNIQUE,
  invited_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,  -- 72時間で失効
  accepted_at TIMESTAMP WITH TIME ZONE,           -- NULL = 未承諾
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token   ON admin_invitations(token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_company ON admin_invitations(company_id);
