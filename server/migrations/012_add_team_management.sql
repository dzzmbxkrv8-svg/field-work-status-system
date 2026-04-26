-- チーム管理機能: descriptionカラム追加、access_codeをNULL許可に変更
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;

-- 管理者UIから作成するチームにはaccess_codeが不要なためNULL許可
ALTER TABLE teams ALTER COLUMN access_code DROP NOT NULL;
