const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const TEST_EMPLOYEE_ID = 'TEST_AUTH_001';

afterAll(async () => {
  await db.query('DELETE FROM users WHERE employee_id = $1', [TEST_EMPLOYEE_ID]);
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
  test('正しいアクセスコードで作業員登録成功', async () => {
    const res = await request(app).post('/api/auth/register').send({
      access_code: 'ABCD1234',
      employee_id: TEST_EMPLOYEE_ID,
      name: 'テスト作業員',
      password: 'testpass123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employee_id).toBe(TEST_EMPLOYEE_ID);
  });

  test('同じ社員IDで重複登録は失敗', async () => {
    const res = await request(app).post('/api/auth/register').send({
      access_code: 'ABCD1234',
      employee_id: TEST_EMPLOYEE_ID,
      name: 'テスト作業員2',
      password: 'testpass123',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('不正なアクセスコードで登録失敗', async () => {
    const res = await request(app).post('/api/auth/register').send({
      access_code: 'INVALID000',
      employee_id: 'TEST_AUTH_002',
      name: 'テスト',
      password: 'testpass123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/reset-password', () => {
  test('正しい社員IDと氏名でパスワードリセット成功', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      employee_id: TEST_EMPLOYEE_ID,
      name: 'テスト作業員',
      new_password: 'newpass456',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('存在しない社員IDでリセット失敗', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      employee_id: 'NONEXISTENT',
      name: '存在しない',
      new_password: 'newpass456',
    });
    expect(res.status).toBe(404);
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
