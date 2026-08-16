-- 020_customizable_shift_types.sql
-- 「フル/ハーフ」のような勤務区分は会社によって概念が異なる（存在しない場合もある）ため、
-- シフト調査ごとに管理者が自由に区分を定義できるようにする

-- 例: ["フル", "ハーフ"] や ["早番", "遅番", "夜勤"]。NULL または空配列なら区分なし（○/△/×のみ）
ALTER TABLE shift_requests ADD COLUMN IF NOT EXISTS shift_type_options JSONB;

-- 従来の 'full'/'half' 固定チェックを外し、自由入力の区分名を保存できるようにする
ALTER TABLE shift_responses DROP CONSTRAINT IF EXISTS shift_responses_shift_type_check;
ALTER TABLE shift_responses ALTER COLUMN shift_type TYPE VARCHAR(50);
ALTER TABLE shift_responses ALTER COLUMN shift_type DROP DEFAULT;
ALTER TABLE shift_responses ALTER COLUMN shift_type DROP NOT NULL;
