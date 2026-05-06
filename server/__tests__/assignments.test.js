const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

let adminToken;
let workerToken;
let createdAssignmentId;

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
  if (createdAssignmentId) {
    await db.query('DELETE FROM assignments WHERE id = $1', [createdAssignmentId]);
  }
});

describe('GET /api/assignments', () => {
  test('管理者トークンで作業指示一覧を取得', async () => {
    const res = await request(app)
      .get('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('作業員トークンでも作業指示一覧を取得', async () => {
    const res = await request(app)
      .get('/api/assignments')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('トークンなしで401エラー', async () => {
    const res = await request(app).get('/api/assignments');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/assignments', () => {
  test('管理者が作業指示を新規作成', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignment_code: 'TEST-9999',
        title: 'テスト作業指示',
        location: '東京都千代田区テスト1-1',
        team_id: 1,
        start_date: '2026-06-01',
        end_date: '2026-06-07',
        priority: 'medium',
        status: 'pending',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('テスト作業指示');
    createdAssignmentId = res.body.data.id;
  });

  test('作業員は作業指示を作成できない（403）', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        assignment_code: 'TEST-9998',
        title: 'テスト',
        location: 'テスト',
        team_id: 1,
        start_date: '2026-06-01',
        end_date: '2026-06-07',
        priority: 'low',
        status: 'pending',
      });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/assignments/:id/status', () => {
  test('管理者が作業ステータスを更新', async () => {
    if (!createdAssignmentId) return;
    const res = await request(app)
      .patch(`/api/assignments/${createdAssignmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /health', () => {
  test('ヘルスチェックが200を返す', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});
