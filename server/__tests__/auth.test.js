const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const TEST_REGISTER_EMAIL = 'test-auth-register@shift-test.local';

afterAll(async () => {
  await db.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [TEST_REGISTER_EMAIL]);
});

describe('POST /api/auth/login', () => {
  test('正しい管理者認証情報でログイン成功', async () => {
    const res = await request(app).post('/api/auth/login').send({
      employee_id: 'ADMIN001',
      password: 'adminpass',
      role: 'admin',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  test('正しい作業員認証情報でログイン成功', async () => {
    const res = await request(app).post('/api/auth/login').send({
      employee_id: 'W001',
      password: 'worker123',
      role: 'worker',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('パスワード誤りでログイン失敗', async () => {
    const res = await request(app).post('/api/auth/login').send({
      employee_id: 'ADMIN001',
      password: 'wrongpassword',
      role: 'admin',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('ロール不一致でログイン失敗', async () => {
    const res = await request(app).post('/api/auth/login').send({
      employee_id: 'ADMIN001',
      password: 'adminpass',
      role: 'worker',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('employee_id 未指定でバリデーションエラー', async () => {
    const res = await request(app).post('/api/auth/login').send({
      password: 'adminpass',
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/register', () => {
  // employee_id はクライアントが指定しても使われず、会社内で自動採番される(W001, W002, ...)。
  // 重複判定も employee_id ではなく、全社を通してユニークな email で行われる。
  test('正しいアクセスコードで作業員登録成功（employee_idは自動採番・承認待ちになる）', async () => {
    const res = await request(app).post('/api/auth/register').send({
      access_code: 'FIELDO2024',
      name: 'テスト作業員',
      email: TEST_REGISTER_EMAIL,
      password: 'TestPass123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employee_id).toMatch(/^W\d+$/);
    expect(res.body.data.status).toBe('pending');
  });

  test('同じメールアドレスで重複登録は失敗', async () => {
    const res = await request(app).post('/api/auth/register').send({
      access_code: 'FIELDO2024',
      name: 'テスト作業員2',
      email: TEST_REGISTER_EMAIL,
      password: 'TestPass123',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('不正なアクセスコードで登録失敗', async () => {
    const res = await request(app).post('/api/auth/register').send({
      access_code: 'INVALID000',
      name: 'テスト',
      email: 'test-auth-invalid-code@shift-test.local',
      password: 'TestPass123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  test('有効なトークンで自分の情報を取得', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      employee_id: 'ADMIN001',
      password: 'adminpass',
      role: 'admin',
    });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.employee_id).toBe('ADMIN001');
  });

  test('トークンなしで401エラー', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
