const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

let adminToken;
let workerToken;
let createdWorkerId;

beforeAll(async () => {
  const adminRes = await request(app).post('/api/auth/login').send({
    employee_id: 'ADMIN001',
    password: 'adminpass',
    role: 'admin',
  });
  adminToken = adminRes.body.token;

  const workerRes = await request(app).post('/api/auth/login').send({
    employee_id: 'W001',
    password: 'worker123',
    role: 'worker',
  });
  workerToken = workerRes.body.token;
});

afterAll(async () => {
  if (createdWorkerId) {
    await db.query('DELETE FROM users WHERE id = $1', [createdWorkerId]);
  }
});

describe('GET /api/workers', () => {
  test('管理者トークンで作業員一覧を取得', async () => {
    const res = await request(app)
      .get('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('作業員トークンでは403エラー', async () => {
    const res = await request(app)
      .get('/api/workers')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(403);
  });

  test('トークンなしで401エラー', async () => {
    const res = await request(app).get('/api/workers');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/workers', () => {
  test('管理者が作業員を新規作成', async () => {
    const res = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_id: 'TEST_W_CREATE',
        name: 'テスト作成太郎',
        password: 'testpass123',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employee_id).toBe('TEST_W_CREATE');
    createdWorkerId = res.body.data.id;
  });

  test('必須フィールド欠落でバリデーションエラー', async () => {
    const res = await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employee_id: 'TEST_W_NONAME' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
