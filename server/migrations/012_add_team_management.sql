-- チーム管理機能の強化
-- teams テーブルに description カラムを追加
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;

-- access_code を NULL 許可に変更（UIから作成するチームはコード不要）
ALTER TABLE teams ALTER COLUMN access_code DROP NOT NULL;
