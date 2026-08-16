const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const db = require('../src/config/db');

// このテストはCIやローカルの実DBに対して実行される（既存テストと同じ方針）。
// 会社1(ADMIN001)の既存作業員は employee_id が他社と重複しておりログインが不安定なため、
// このテスト専用の作業員・別会社管理者を都度作成し、afterAllで確実に削除する。
const TEST_PASSWORD = 'TestPass123!';
let TEST_PASSWORD_HASH;

let adminToken;      // 会社1 既存管理者 (ADMIN001)
let worker1Token;    // 会社1 テスト用作業員1
let worker2Token;    // 会社1 テスト用作業員2
let worker3Token;    // 会社1 テスト用作業員3（在籍状態を切り替えて確定対象から外れることを確認する）
let otherAdminToken; // 会社2 テスト用管理者（他社データが見えないことを確認する）

const createdUserIds = [];
let worker1Id, worker2Id, worker3Id;

let mainShiftId;     // 勤務区分なしの基本シフト（回答・確定・利用可否判定のテストに使う）
let typedShiftId;    // 勤務区分ありのシフト（shift_type必須バリデーションのテストに使う）
const createdShiftIds = [];

const DAY1 = '2027-03-01';
const DAY2 = '2027-03-02';
const DAY3 = '2027-03-03';
const TYPED_DAY = '2027-04-01';

async function createTestUser({ employeeId, name, role, companyId }) {
  const email = `${employeeId.toLowerCase()}@shift-test.local`;
  const { rows } = await db.query(
    `INSERT INTO users (employee_id, name, role, password_hash, is_active, email, status, company_id)
     VALUES ($1, $2, $3, $4, true, $5, 'active', $6) RETURNING id`,
    [employeeId, name, role, TEST_PASSWORD_HASH, email, companyId]
  );
  createdUserIds.push(rows[0].id);
  const loginRes = await request(app).post('/api/auth/login').send({
    employee_id: email, // '@'を含むのでメールアドレスとして扱われ、会社をまたいだ衝突を回避できる
    password: TEST_PASSWORD,
    role,
  });
  return { id: rows[0].id, token: loginRes.body.token };
}

beforeAll(async () => {
  TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 10);

  const adminRes = await request(app).post('/api/auth/login').send({
    employee_id: 'ADMIN001',
    password: 'adminpass',
    role: 'admin',
  });
  adminToken = adminRes.body.token;

  const w1 = await createTestUser({ employeeId: 'SFTW1', name: 'シフトテスト1号', role: 'worker', companyId: 1 });
  worker1Token = w1.token; worker1Id = w1.id;
  const w2 = await createTestUser({ employeeId: 'SFTW2', name: 'シフトテスト2号', role: 'worker', companyId: 1 });
  worker2Token = w2.token; worker2Id = w2.id;
  const w3 = await createTestUser({ employeeId: 'SFTW3', name: 'シフトテスト3号', role: 'worker', companyId: 1 });
  worker3Token = w3.token; worker3Id = w3.id;
  const otherAdmin = await createTestUser({ employeeId: 'SFTADM2', name: 'シフトテスト他社管理者', role: 'admin', companyId: 2 });
  otherAdminToken = otherAdmin.token;
});

afterAll(async () => {
  if (createdShiftIds.length > 0) {
    // shift_responses/shift_confirmedはON DELETE CASCADEで消えるが、
    // assignments/messagesのshift_request_idはON DELETE SET NULLなので明示的に消す
    await db.query('DELETE FROM assignments WHERE shift_request_id = ANY($1::int[])', [createdShiftIds]);
    await db.query('DELETE FROM messages WHERE shift_request_id = ANY($1::int[])', [createdShiftIds]);
    await db.query('DELETE FROM shift_requests WHERE id = ANY($1::int[])', [createdShiftIds]);
  }
  if (createdUserIds.length > 0) {
    await db.query('DELETE FROM messages WHERE sender_id = ANY($1::int[]) OR receiver_id = ANY($1::int[])', [createdUserIds]);
    await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [createdUserIds]);
  }
});

describe('前提: テスト用アカウントが正しくログインできる', () => {
  test('全アカウントでトークンが発行されている', () => {
    expect(adminToken).toBeTruthy();
    expect(worker1Token).toBeTruthy();
    expect(worker2Token).toBeTruthy();
    expect(worker3Token).toBeTruthy();
    expect(otherAdminToken).toBeTruthy();
  });
});

describe('POST /api/shifts (シフト調査の作成)', () => {
  test('管理者が勤務区分なしのシフト調査を作成できる', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'テスト用シフト調査', period_start: DAY1, period_end: DAY3 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('テスト用シフト調査');
    mainShiftId = res.body.data.id;
    createdShiftIds.push(mainShiftId);
  });

  test('管理者が勤務区分ありのシフト調査を作成できる', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'テスト用シフト調査(区分あり)',
        period_start: TYPED_DAY,
        period_end: TYPED_DAY,
        shift_type_options: ['フル', 'ハーフ'],
      });
    expect(res.status).toBe(201);
    typedShiftId = res.body.data.id;
    createdShiftIds.push(typedShiftId);
  });

  test('作業員は作成できない（403）', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ title: 'だめなやつ', period_start: DAY1, period_end: DAY3 });
    expect(res.status).toBe(403);
  });

  test('タイトル未指定は400', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ period_start: DAY1, period_end: DAY3 });
    expect(res.status).toBe(400);
  });

  test('終了日が開始日より前だと400', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '逆転期間', period_start: DAY3, period_end: DAY1 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/shifts / GET /api/shifts/:id', () => {
  test('管理者が一覧を取得でき、作成した調査が含まれる', async () => {
    const res = await request(app)
      .get('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some(s => s.id === mainShiftId)).toBe(true);
  });

  test('作業員は一覧を取得できない（403）', async () => {
    const res = await request(app)
      .get('/api/shifts')
      .set('Authorization', `Bearer ${worker1Token}`);
    expect(res.status).toBe(403);
  });

  test('作業員が詳細を取得すると、回答前は myResponses が空配列', async () => {
    const res = await request(app)
      .get(`/api/shifts/${mainShiftId}`)
      .set('Authorization', `Bearer ${worker1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.myResponses).toEqual([]);
  });

  test('他社の管理者からは見えない（404、company_idでスコープされている）', async () => {
    const res = await request(app)
      .get(`/api/shifts/${mainShiftId}`)
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/shifts/:id/respond (作業員の回答)', () => {
  test('作業員が○/△/×で回答できる', async () => {
    const res = await request(app)
      .post(`/api/shifts/${mainShiftId}/respond`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ responses: [{ date: DAY1, availability: 'unavailable' }] });
    expect(res.status).toBe(200);
    expect(res.body.data[0].availability).toBe('unavailable');
  });

  test('管理者は回答できない（403）', async () => {
    const res = await request(app)
      .post(`/api/shifts/${mainShiftId}/respond`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ responses: [{ date: DAY1, availability: 'available' }] });
    expect(res.status).toBe(403);
  });

  test('不正な availability 値は400', async () => {
    const res = await request(app)
      .post(`/api/shifts/${mainShiftId}/respond`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ responses: [{ date: DAY2, availability: 'maybe-not-a-real-value' }] });
    expect(res.status).toBe(400);
  });

  test('存在しないシフトIDは404', async () => {
    const res = await request(app)
      .post('/api/shifts/999999999/respond')
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ responses: [{ date: DAY1, availability: 'available' }] });
    expect(res.status).toBe(404);
  });

  test('勤務区分が定義されたシフトで区分未指定なら400（回帰: サーバー側でも必須にする）', async () => {
    const res = await request(app)
      .post(`/api/shifts/${typedShiftId}/respond`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ responses: [{ date: TYPED_DAY, availability: 'available' }] }); // shift_type無し
    expect(res.status).toBe(400);
  });

  test('勤務区分が定義されたシフトで不正な区分名なら400', async () => {
    const res = await request(app)
      .post(`/api/shifts/${typedShiftId}/respond`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ responses: [{ date: TYPED_DAY, availability: 'available', shift_type: '存在しない区分' }] });
    expect(res.status).toBe(400);
  });

  test('勤務区分が定義されたシフトで正しい区分名なら200', async () => {
    const res = await request(app)
      .post(`/api/shifts/${typedShiftId}/respond`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ responses: [{ date: TYPED_DAY, availability: 'available', shift_type: 'フル' }] });
    expect(res.status).toBe(200);
    expect(res.body.data[0].shift_type).toBe('フル');
  });

  test('×の回答では勤務区分が無くても200（区分は出勤可の場合のみ必須）', async () => {
    const res = await request(app)
      .post(`/api/shifts/${typedShiftId}/respond`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({ responses: [{ date: TYPED_DAY, availability: 'unavailable' }] });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/shifts/availability (回帰: 未回答は×と区別してnullを返す)', () => {
  test('明示的に×と回答した作業員は available:false', async () => {
    const res = await request(app)
      .get(`/api/shifts/availability?start=${DAY1}&end=${DAY1}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entry = res.body.data.find(a => a.worker_id === worker1Id);
    expect(entry.available).toBe(false);
  });

  test('一度も回答していない作業員は available:null（falseと同一視しない）', async () => {
    const res = await request(app)
      .get(`/api/shifts/availability?start=${DAY1}&end=${DAY1}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const entry = res.body.data.find(a => a.worker_id === worker2Id);
    expect(entry.available).toBeNull();
  });

  test('作業員は呼び出せない（403）', async () => {
    const res = await request(app)
      .get(`/api/shifts/availability?start=${DAY1}&end=${DAY1}`)
      .set('Authorization', `Bearer ${worker1Token}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/shifts/:id/confirm-all と作業指示連携', () => {
  beforeAll(async () => {
    // worker2: DAY2に○で回答 → 確定対象
    await request(app)
      .post(`/api/shifts/${mainShiftId}/respond`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({ responses: [{ date: DAY2, availability: 'available' }] });
    // worker3: DAY2に○で回答した後、在籍状態をfalseにする → 確定対象から除外されるはず（回帰テスト）
    await request(app)
      .post(`/api/shifts/${mainShiftId}/respond`)
      .set('Authorization', `Bearer ${worker3Token}`)
      .send({ responses: [{ date: DAY2, availability: 'available' }] });
    await db.query('UPDATE users SET is_active=false WHERE id=$1', [worker3Id]);
  });

  afterAll(async () => {
    // 後続のクリーンアップ（DELETE FROM users）が支障なく通るよう在籍状態を戻しておく
    await db.query('UPDATE users SET is_active=true WHERE id=$1', [worker3Id]);
  });

  test('一括確定で、○と回答した在籍中の作業員だけが確定され、作業指示が自動生成される', async () => {
    const res = await request(app)
      .post(`/api/shifts/${mainShiftId}/confirm-all`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 対象はworker2のみ（worker3は在籍状態がfalseなので除外される）
    expect(res.body.confirmedCount).toBe(1);

    const confirmed = await db.query(
      'SELECT worker_id FROM shift_confirmed WHERE shift_request_id=$1 AND date=$2',
      [mainShiftId, DAY2]
    );
    expect(confirmed.rows.map(r => r.worker_id)).toContain(worker2Id);
    expect(confirmed.rows.map(r => r.worker_id)).not.toContain(worker3Id);

    const assignment = await db.query(
      'SELECT * FROM assignments WHERE shift_request_id=$1 AND assigned_worker_id=$2',
      [mainShiftId, worker2Id]
    );
    expect(assignment.rows.length).toBe(1);
    expect(assignment.rows[0].status).toBe('pending');
  });

  test('作業員は確定を実行できない（403）', async () => {
    const res = await request(app)
      .post(`/api/shifts/${mainShiftId}/confirm-all`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({});
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/shifts/:id', () => {
  test('作業員は削除できない（403）', async () => {
    const res = await request(app)
      .delete(`/api/shifts/${typedShiftId}`)
      .set('Authorization', `Bearer ${worker1Token}`);
    expect(res.status).toBe(403);
  });

  test('管理者が削除でき、以後は404になる', async () => {
    const delRes = await request(app)
      .delete(`/api/shifts/${typedShiftId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/shifts/${typedShiftId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);

    // afterAllでの二重削除を避ける
    createdShiftIds.splice(createdShiftIds.indexOf(typedShiftId), 1);
  });
});
