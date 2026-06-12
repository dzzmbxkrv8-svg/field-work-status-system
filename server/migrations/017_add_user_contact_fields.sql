-- 012_add_user_contact_fields.sql
-- 作業員の詳細情報・承認ステータスを追加

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS furigana VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS status   VARCHAR(20) DEFAULT 'active';

-- 既存ユーザーは全員アクティブ
UPDATE users SET status = 'active' WHERE status IS NULL;

-- 新規登録は 'pending'、管理者承認後に 'active' になる
-- status の取りうる値: 'pending' | 'active'
