-- 025_add_skill_and_geo_fields.sql
-- AIによる自動アサイン機能（距離＋パワーバランス考慮）のための下地
--
-- skill_level: 1=初級 / 2=中級 / 3=上級（管理者が手動設定、未設定はNULL）
-- lat/lng: 住所を保存する際にジオコーディングして自動算出する作業員の座標

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS skill_level SMALLINT CHECK (skill_level IS NULL OR skill_level BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);
