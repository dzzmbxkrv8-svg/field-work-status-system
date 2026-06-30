-- 014_create_companies.sql
-- マルチテナント対応: 会社テーブルを新設し、各データを会社単位に分離する

-- settings テーブルが未作成の場合に備えて先に作成（016番と重複するがIF NOT EXISTSで安全）
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  access_code    VARCHAR(20) UNIQUE NOT NULL,   -- Fieldo運営が一意に発行 (FLD-XXXX-XXXX)
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | active | suspended
  approval_token TEXT UNIQUE,                   -- 運営承認リンク用トークン
  approved_at    TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 既存インストールをデフォルト会社として移行（設定済みのアクセスコードを引き継ぐ）
INSERT INTO companies (name, access_code, status, approved_at)
SELECT 'マイカンパニー',
       COALESCE((SELECT value FROM settings WHERE key = 'company_access_code'), 'FLD-0000-0000'),
       'active',
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM companies);

ALTER TABLE users       ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE teams       ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE settings    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

UPDATE users       SET company_id = (SELECT MIN(id) FROM companies) WHERE company_id IS NULL;
UPDATE teams       SET company_id = (SELECT MIN(id) FROM companies) WHERE company_id IS NULL;
UPDATE assignments SET company_id = (SELECT MIN(id) FROM companies) WHERE company_id IS NULL;
UPDATE settings    SET company_id = (SELECT MIN(id) FROM companies) WHERE company_id IS NULL;

-- アクセスコードは companies に移管したため設定からは削除
DELETE FROM settings WHERE key = 'company_access_code';

-- settings は会社ごとのキーバリューに変更
ALTER TABLE settings DROP CONSTRAINT settings_pkey;
ALTER TABLE settings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE settings ADD PRIMARY KEY (company_id, key);

-- 作業員ID・案件コードは「会社内で一意」に変更（会社をまたぐ重複は許可）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_employee_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_company_employee ON users(company_id, employee_id);
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignments_company_code ON assignments(company_id, assignment_code);

ALTER TABLE users       ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE teams       ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_company       ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_company       ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_assignments_company ON assignments(company_id);
