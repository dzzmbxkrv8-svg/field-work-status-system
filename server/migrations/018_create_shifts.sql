-- 018_create_shifts.sql
-- シフト管理機能: 管理者がシフト調査を作成し、作業員が日付ごとに○×△で回答、
-- 管理者がカレンダービューで確認・確定する

-- シフト募集（マルチテナント対応のため company_id で分離）
CREATE TABLE IF NOT EXISTS shift_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  deadline DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open / closed / confirmed
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 作業員のシフト回答（日付ごと）
CREATE TABLE IF NOT EXISTS shift_responses (
  id SERIAL PRIMARY KEY,
  shift_request_id INTEGER NOT NULL REFERENCES shift_requests(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  availability VARCHAR(20) NOT NULL CHECK (availability IN ('available', 'unavailable', 'maybe')),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shift_request_id, worker_id, date)
);

-- 確定シフト
CREATE TABLE IF NOT EXISTS shift_confirmed (
  id SERIAL PRIMARY KEY,
  shift_request_id INTEGER NOT NULL REFERENCES shift_requests(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shift_request_id, worker_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shift_requests_company  ON shift_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_responses_request ON shift_responses(shift_request_id);
CREATE INDEX IF NOT EXISTS idx_shift_responses_worker  ON shift_responses(worker_id);
CREATE INDEX IF NOT EXISTS idx_shift_confirmed_request ON shift_confirmed(shift_request_id);

-- シフト調査を「メッセージ」として作業員へ一斉送信するためのリンク
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shift_request_id INTEGER REFERENCES shift_requests(id) ON DELETE SET NULL;
