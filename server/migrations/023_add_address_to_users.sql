-- 023_add_address_to_users.sql
-- 作業員管理の編集画面から住所を登録できるようにする

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS address VARCHAR(255);
