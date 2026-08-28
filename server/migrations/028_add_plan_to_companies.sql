-- 028_add_plan_to_companies.sql
-- 会社ごとの契約プランを表す列を追加。
-- 実際の決済処理(Stripe等)は未接続のため、現時点では手動で管理する
-- 「現在のプラン表示」用のデータ基盤として用意する。

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'enterprise'));
