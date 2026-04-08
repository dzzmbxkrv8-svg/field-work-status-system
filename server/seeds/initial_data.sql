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
