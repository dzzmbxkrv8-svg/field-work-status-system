-- ふりがな列を追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS furigana TEXT;

-- 既存作業員のふりがなを設定
UPDATE users SET furigana = 'たなかたろう'    WHERE employee_id = 'W001';
UPDATE users SET furigana = 'さとうじろう'    WHERE employee_id = 'W002';
UPDATE users SET furigana = 'すずきはなこ'    WHERE employee_id = 'W003';
UPDATE users SET furigana = 'やまだけんじ'    WHERE employee_id = 'W004';
UPDATE users SET furigana = 'いとうおさむ'    WHERE employee_id = 'W005';
UPDATE users SET furigana = 'わたなべかずや'  WHERE employee_id = 'W006';
UPDATE users SET furigana = 'なかむらしょうた' WHERE employee_id = 'W007';
UPDATE users SET furigana = 'こばやしだいすけ' WHERE employee_id = 'W008';
UPDATE users SET furigana = 'かとうたつや'    WHERE employee_id = 'W009';
UPDATE users SET furigana = 'まつもとたくや'  WHERE employee_id = 'W010';
