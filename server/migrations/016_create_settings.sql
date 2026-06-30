-- 016_create_settings.sql
-- アプリ全体の設定値を管理するキーバリューテーブル
-- 014 で既に作成・変更されている場合はスキップ

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 初期値：作業員ホーム画面に表示するお知らせ（company_idカラムがある場合はスキップ）
INSERT INTO settings (key, value)
SELECT 'announcement', '【安全通知】作業前に安全確認を必ず行ってください。ヘルメット・安全帯の着用を徹底してください。'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'announcement')
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_id'
  );
