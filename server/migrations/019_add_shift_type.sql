-- 019_add_shift_type.sql
-- シフト回答にフル/ハーフ区分を追加
-- ○(available) または △(maybe) を選択した際に、フル勤務かハーフ勤務かを指定できる

ALTER TABLE shift_responses
  ADD COLUMN IF NOT EXISTS shift_type VARCHAR(10) NOT NULL DEFAULT 'full'
  CHECK (shift_type IN ('full', 'half'));
