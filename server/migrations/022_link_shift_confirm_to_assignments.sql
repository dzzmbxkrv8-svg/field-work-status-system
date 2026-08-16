-- 022_link_shift_confirm_to_assignments.sql
-- シフト希望(フル/ハーフ等の勤務区分を含む)が確定されたら、その情報をそのまま
-- 作業指示(assignments)側に連携できるようにする

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS shift_type VARCHAR(50);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS shift_request_id INTEGER REFERENCES shift_requests(id) ON DELETE SET NULL;
-- シフト確定から自動生成する案件コード用に少し余裕を持たせる
ALTER TABLE assignments ALTER COLUMN assignment_code TYPE VARCHAR(40);

-- 同じシフト確定から同じ作業員・同じ日付の作業指示が重複して作られないようにする
CREATE UNIQUE INDEX IF NOT EXISTS uniq_assignments_shift_request_worker_date
  ON assignments(shift_request_id, assigned_worker_id, start_date)
  WHERE shift_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_shift_request ON assignments(shift_request_id);
