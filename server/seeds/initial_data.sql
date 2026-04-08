-- テストチーム
INSERT INTO teams (name, access_code) VALUES
  ('North Survey', 'ABCD1234')
ON CONFLICT DO NOTHING;

-- テスト作業員（パスワード: worker123 をbcryptでハッシュ化した値）
INSERT INTO users (employee_id, name, role, team_id, password_hash) VALUES
  ('W001', '田中太郎', 'worker', 1, '$2b$10$zSwT64N5tlnKJztqTbtKreLUc8SUUTk3AjrYfuzZDRsIZOsP84vae'),
  ('W002', '佐藤次郎', 'worker', 1, '$2b$10$zSwT64N5tlnKJztqTbtKreLUc8SUUTk3AjrYfuzZDRsIZOsP84vae'),
  ('W003', '鈴木花子', 'worker', 1, '$2b$10$zSwT64N5tlnKJztqTbtKreLUc8SUUTk3AjrYfuzZDRsIZOsP84vae')
ON CONFLICT DO NOTHING;

-- テスト管理者（パスワード: adminpass をbcryptでハッシュ化した値）
INSERT INTO users (employee_id, name, role, password_hash) VALUES
  ('ADMIN001', 'いろはにほへと', 'admin', '$2b$10$K.UPshoW0hZJQ0qkCx1cZuPX9iMKS8j/3zWnRceBZ/3osEn99kdDi')
ON CONFLICT DO NOTHING;

-- テスト作業指示
INSERT INTO assignments (assignment_code, title, location, team_id, assigned_worker_id, status, priority, start_date, end_date) VALUES
  ('FW-1001', '横浜港測量業務', '神奈川県横浜市中区', 1, 1, 'pending', 'high', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
  ('FW-1002', '川崎橋梁点検', '神奈川県川崎市幸区', 1, 1, 'in_progress', 'medium', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days'),
  ('FW-1003', '品川再開発エリア調査', '東京都港区港南', 1, 2, 'pending', 'low', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '10 days')
ON CONFLICT DO NOTHING;
