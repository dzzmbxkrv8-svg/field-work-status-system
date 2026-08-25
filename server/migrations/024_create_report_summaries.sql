-- 024_create_report_summaries.sql
-- 完了済み案件のAI要約結果をキャッシュするテーブル
-- （同じ会社・同じ期間で何度も要約API(有料)を呼ばないようにするため）

CREATE TABLE IF NOT EXISTS report_summaries (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  summary_text TEXT NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, start_date, end_date)
);
