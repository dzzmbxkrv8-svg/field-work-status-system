-- 021_customizable_availability_options.sql
-- ○(出勤可)/△(応相談)/×(出勤不可) のうちどれを回答の選択肢として使うかも
-- 勤務区分と同様、募集ごとに管理者がカスタマイズできるようにする。
-- 例: ["available","unavailable"] （△なし、○×のみ）
-- NULL または未指定なら従来通り全て（○/△/×）を使う

ALTER TABLE shift_requests ADD COLUMN IF NOT EXISTS availability_options JSONB;
