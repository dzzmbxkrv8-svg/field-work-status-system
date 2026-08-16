const db = require('../config/db');
const { sendToWorkers, sendToAdmins } = require('../events/sseManager');

const ALL_AVAILABILITY = ['available', 'maybe', 'unavailable'];
const VALID_AVAILABILITY = new Set(ALL_AVAILABILITY);
const MAX_SHIFT_TYPE_OPTIONS = 8;
const MAX_SHIFT_TYPE_LABEL_LEN = 20;

function toDateStr(d) {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
}

// 管理者が入力した勤務区分（フル/ハーフ等）を検証・正規化する。
// 会社によっては概念自体が無いため、未指定なら null（区分なし = ○/△/×のみ）を返す
function normalizeShiftTypeOptions(input) {
  if (input == null) return null;
  if (!Array.isArray(input)) {
    throw new Error('勤務区分の形式が正しくありません');
  }
  const cleaned = [];
  const seen = new Set();
  for (const raw of input) {
    if (typeof raw !== 'string') throw new Error('勤務区分の形式が正しくありません');
    const label = raw.trim();
    if (!label) continue;
    if (label.length > MAX_SHIFT_TYPE_LABEL_LEN) throw new Error(`勤務区分は${MAX_SHIFT_TYPE_LABEL_LEN}文字以内にしてください`);
    if (seen.has(label)) continue;
    seen.add(label);
    cleaned.push(label);
  }
  if (cleaned.length > MAX_SHIFT_TYPE_OPTIONS) throw new Error(`勤務区分は${MAX_SHIFT_TYPE_OPTIONS}個までです`);
  return cleaned.length > 0 ? cleaned : null;
}

// 管理者が選んだ回答の選択肢（○/△/×のうちどれを使うか）を検証・正規化する。
// 未指定なら null（従来通り○/△/×すべて）を返す
function normalizeAvailabilityOptions(input) {
  if (input == null) return null;
  if (!Array.isArray(input)) {
    throw new Error('回答選択肢の形式が正しくありません');
  }
  const cleaned = [];
  const seen = new Set();
  for (const v of input) {
    if (!VALID_AVAILABILITY.has(v)) throw new Error('回答選択肢の形式が正しくありません');
    if (seen.has(v)) continue;
    seen.add(v);
    cleaned.push(v);
  }
  if (cleaned.length < 2) throw new Error('回答選択肢は2つ以上選んでください');
  // 3つとも選ばれていれば従来のデフォルトと同じなので null に統一
  return cleaned.length < ALL_AVAILABILITY.length ? cleaned : null;
}

// シフト確定から自動生成する作業指示の案件コード（募集ID+日付+作業員IDで一意）
function buildShiftAssignmentCode(shiftId, date, workerId) {
  return `SFT${shiftId}-${date.replace(/-/g, '')}-${workerId}`;
}

// period_start〜period_end の日付配列（両端含む）を生成
function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// 会社内の全作業員へシフト調査カードをメッセージとして一斉送信
async function broadcastShiftMessage(companyId, senderId, shiftId, content) {
  const { rows: workers } = await db.query(
    `SELECT id FROM users WHERE role='worker' AND is_active=true AND company_id=$1`,
    [companyId]
  );
  await Promise.all(workers.map(w =>
    db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, shift_request_id) VALUES ($1, $2, $3, $4)`,
      [senderId, w.id, content, shiftId]
    )
  ));
  sendToWorkers('new_message', { shiftRequestId: shiftId }, companyId);
}

// 管理者: シフト調査を作成し、全作業員のメッセージ画面へ一斉送信
exports.createShiftRequest = async (req, res, next) => {
  try {
    const { title, period_start, period_end, deadline, shift_type_options, availability_options } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'タイトルは必須です' });
    }
    if (!period_start || !period_end) {
      return res.status(400).json({ success: false, message: '期間の開始日と終了日が必要です' });
    }
    if (new Date(period_start) > new Date(period_end)) {
      return res.status(400).json({ success: false, message: '期間の指定が正しくありません' });
    }

    let shiftTypeOptions;
    let availabilityOptions;
    try {
      shiftTypeOptions = normalizeShiftTypeOptions(shift_type_options);
      availabilityOptions = normalizeAvailabilityOptions(availability_options);
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message });
    }

    const { rows } = await db.query(
      `INSERT INTO shift_requests (company_id, title, period_start, period_end, deadline, created_by, shift_type_options, availability_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user.company_id, title.trim(), period_start, period_end, deadline || null, req.user.id,
        shiftTypeOptions ? JSON.stringify(shiftTypeOptions) : null,
        availabilityOptions ? JSON.stringify(availabilityOptions) : null,
      ]
    );
    const shift = rows[0];

    await broadcastShiftMessage(
      req.user.company_id,
      req.user.id,
      shift.id,
      `シフト調査「${shift.title}」が届きました。回答をお願いします。`
    );

    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

// 管理者: シフト募集一覧
exports.getShifts = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT sr.*,
         (SELECT COUNT(DISTINCT worker_id) FROM shift_responses WHERE shift_request_id = sr.id) AS respondent_count
       FROM shift_requests sr
       WHERE sr.company_id = $1
       ORDER BY sr.created_at DESC`,
      [req.user.company_id]
    );
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

// 募集詳細（作業員がアクセスした場合は自分の回答も含める）
exports.getShiftById = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM shift_requests WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    const shift = rows[0];

    let myResponses = [];
    if (req.user.role === 'worker') {
      const r = await db.query(
        `SELECT date, availability, shift_type, note FROM shift_responses WHERE shift_request_id=$1 AND worker_id=$2`,
        [shift.id, req.user.id]
      );
      myResponses = r.rows.map(row => ({ ...row, date: toDateStr(row.date) }));
    }

    res.status(200).json({ success: true, data: { ...shift, myResponses } });
  } catch (error) {
    next(error);
  }
};

// 管理者: 日付ごとの回答集計（カレンダービュー用）
exports.getShiftSummary = async (req, res, next) => {
  try {
    const { rows: shiftRows } = await db.query(
      `SELECT * FROM shift_requests WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (shiftRows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    const shift = shiftRows[0];

    const { rows: responses } = await db.query(
      `SELECT r.date, r.worker_id, r.availability, r.shift_type, r.note, u.name AS worker_name
       FROM shift_responses r
       JOIN users u ON r.worker_id = u.id
       WHERE r.shift_request_id = $1
       ORDER BY u.name ASC`,
      [shift.id]
    );
    const { rows: confirmed } = await db.query(
      `SELECT date, worker_id FROM shift_confirmed WHERE shift_request_id=$1`,
      [shift.id]
    );
    const confirmedSet = new Set(confirmed.map(c => `${toDateStr(c.date)}_${c.worker_id}`));

    const dates = dateRange(shift.period_start, shift.period_end);
    const byDate = {};
    dates.forEach(d => { byDate[d] = []; });
    responses.forEach(r => {
      const d = toDateStr(r.date);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push({
        workerId: r.worker_id,
        workerName: r.worker_name,
        availability: r.availability,
        shiftType: r.shift_type || null,
        note: r.note,
        confirmed: confirmedSet.has(`${d}_${r.worker_id}`),
      });
    });

    res.status(200).json({ success: true, data: { shift, dates, byDate } });
  } catch (error) {
    next(error);
  }
};

// 作業員: 複数日をまとめて回答
exports.respondToShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ success: false, message: '作業員のみ回答できます' });
    }
    const { responses } = req.body;
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ success: false, message: '回答内容が必要です' });
    }
    for (const r of responses) {
      if (!r.date || !VALID_AVAILABILITY.has(r.availability)) {
        return res.status(400).json({ success: false, message: '回答の形式が正しくありません' });
      }
    }

    const { rows: shiftRows } = await db.query(
      `SELECT * FROM shift_requests WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (shiftRows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    // この募集で管理者が定義した勤務区分（未定義なら区分なし）
    const shiftTypeOptions = Array.isArray(shiftRows[0].shift_type_options) ? shiftRows[0].shift_type_options : null;
    const validShiftTypes = shiftTypeOptions ? new Set(shiftTypeOptions) : null;
    // この募集で使う回答選択肢（未定義なら○/△/×すべて）
    const availabilityOptions = Array.isArray(shiftRows[0].availability_options) ? shiftRows[0].availability_options : ALL_AVAILABILITY;
    const validAvailability = new Set(availabilityOptions);

    for (const r of responses) {
      if (!validAvailability.has(r.availability)) {
        return res.status(400).json({ success: false, message: 'この募集では選択できない回答です' });
      }
      if (validShiftTypes && r.availability !== 'unavailable') {
        // 勤務区分が定義されている募集で○/△と回答する場合は、UIと同じ規則をサーバー側でも強制する
        if (!r.shift_type) {
          return res.status(400).json({ success: false, message: '勤務区分を選択してください' });
        }
        if (!validShiftTypes.has(r.shift_type)) {
          return res.status(400).json({ success: false, message: '勤務区分の形式が正しくありません' });
        }
      }
    }

    const results = await Promise.all(responses.map(r => {
      // 区分が定義されていない募集、または×の場合は shift_type を持たせない
      const shiftType = (validShiftTypes && r.availability !== 'unavailable' && validShiftTypes.has(r.shift_type))
        ? r.shift_type
        : null;
      return db.query(
        `INSERT INTO shift_responses (shift_request_id, worker_id, date, availability, shift_type, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (shift_request_id, worker_id, date)
         DO UPDATE SET availability = EXCLUDED.availability, shift_type = EXCLUDED.shift_type, note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [req.params.id, req.user.id, r.date, r.availability, shiftType, r.note || null]
      );
    }));

    sendToAdmins('new_message', { shiftResponse: true, shiftRequestId: Number(req.params.id) }, req.user.company_id);

    res.status(200).json({ success: true, data: results.map(r => r.rows[0]) });
  } catch (error) {
    next(error);
  }
};

// 管理者: 特定日のシフトを確定（対象作業員を指定）
exports.confirmShiftDate = async (req, res, next) => {
  try {
    const { date, worker_ids } = req.body;
    if (!date || !Array.isArray(worker_ids)) {
      return res.status(400).json({ success: false, message: '日付と作業員リストが必要です' });
    }

    const { rows: shiftRows } = await db.query(
      `SELECT * FROM shift_requests WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (shiftRows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    const shift = shiftRows[0];

    // 会社に所属する在籍中の作業員のみ確定対象にできることを確認
    const { rows: validWorkers } = await db.query(
      `SELECT id, team_id FROM users WHERE id = ANY($1::int[]) AND role='worker' AND is_active=true AND company_id=$2`,
      [worker_ids, req.user.company_id]
    );
    const validIds = validWorkers.map(w => w.id);
    const teamByWorker = new Map(validWorkers.map(w => [w.id, w.team_id]));

    // 解除対象（これまで確定していたが、今回のリストに含まれなくなった作業員）を先に控えておく
    const { rows: previouslyConfirmed } = await db.query(
      `SELECT worker_id FROM shift_confirmed WHERE shift_request_id=$1 AND date=$2`,
      [shift.id, date]
    );
    const removedIds = previouslyConfirmed.map(r => r.worker_id).filter(id => !validIds.includes(id));

    await db.query(`DELETE FROM shift_confirmed WHERE shift_request_id=$1 AND date=$2`, [shift.id, date]);

    // 確定から外れた作業員に紐づく自動連携済みの作業指示はキャンセル扱いにする
    if (removedIds.length > 0) {
      await db.query(
        `UPDATE assignments SET status='cancelled', updated_at=NOW()
         WHERE shift_request_id=$1 AND start_date=$2 AND assigned_worker_id = ANY($3::int[])`,
        [shift.id, date, removedIds]
      );
    }

    if (validIds.length > 0) {
      await Promise.all(validIds.map(wid =>
        db.query(
          `INSERT INTO shift_confirmed (shift_request_id, worker_id, date) VALUES ($1, $2, $3)
           ON CONFLICT (shift_request_id, worker_id, date) DO NOTHING`,
          [shift.id, wid, date]
        )
      ));

      // この日・この作業員たちのシフト回答（勤務区分・メモ含む）を取得し、作業指示へそのまま連携する
      const { rows: responses } = await db.query(
        `SELECT worker_id, availability, shift_type, note FROM shift_responses
         WHERE shift_request_id=$1 AND date=$2 AND worker_id = ANY($3::int[])`,
        [shift.id, date, validIds]
      );
      const responseByWorker = new Map(responses.map(r => [r.worker_id, r]));

      await Promise.all(validIds.map(wid => {
        const response = responseByWorker.get(wid);
        const code = buildShiftAssignmentCode(shift.id, date, wid);
        return db.query(
          `INSERT INTO assignments (
             assignment_code, title, team_id, assigned_worker_id, status, priority,
             start_date, end_date, description, shift_type, shift_request_id, company_id
           )
           VALUES ($1, $2, $3, $4, 'pending', 'medium', $5, $5, $6, $7, $8, $9)
           ON CONFLICT (shift_request_id, assigned_worker_id, start_date) WHERE shift_request_id IS NOT NULL
           DO UPDATE SET
             shift_type = EXCLUDED.shift_type,
             description = EXCLUDED.description,
             status = 'pending',
             updated_at = NOW()
           RETURNING *`,
          [
            code, shift.title, teamByWorker.get(wid) || null, wid, date,
            response?.note || null, response?.shift_type || null, shift.id, req.user.company_id,
          ]
        );
      }));

      await Promise.all(validIds.map(wid =>
        db.query(
          `INSERT INTO messages (sender_id, receiver_id, content, shift_request_id) VALUES ($1, $2, $3, $4)`,
          [req.user.id, wid, `シフト「${shift.title}」${date} のシフトが確定しました。`, shift.id]
        )
      ));
      sendToWorkers('new_message', { shiftRequestId: shift.id }, req.user.company_id);
      sendToWorkers('new_assignment', { title: shift.title }, req.user.company_id);
    }

    res.status(200).json({ success: true, message: '確定しました' });
  } catch (error) {
    next(error);
  }
};

// 管理者: 期間全体を一括確定（○と回答した作業員をまとめて確定する）
// 既存の確定は上書きしない（追加のみ）ので、個別に確定済みの日程に影響しない
exports.confirmAllDates = async (req, res, next) => {
  try {
    const { rows: shiftRows } = await db.query(
      `SELECT * FROM shift_requests WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (shiftRows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    const shift = shiftRows[0];

    // ○(available)と回答した会社所属の在籍中の作業員のみが対象
    const { rows: responses } = await db.query(
      `SELECT r.worker_id, r.date, r.shift_type, r.note, u.team_id
       FROM shift_responses r
       JOIN users u ON r.worker_id = u.id AND u.role='worker' AND u.is_active=true AND u.company_id=$2
       WHERE r.shift_request_id=$1 AND r.availability='available'`,
      [shift.id, req.user.company_id]
    );
    if (responses.length === 0) {
      return res.status(200).json({ success: true, message: '確定できる回答（○）がありませんでした', confirmedCount: 0 });
    }

    // 既に確定済みの(日付, 作業員)は対象から除外し、まだ確定していない分だけ追加する
    const { rows: existingConfirmed } = await db.query(
      `SELECT worker_id, date FROM shift_confirmed WHERE shift_request_id=$1`,
      [shift.id]
    );
    const existingSet = new Set(existingConfirmed.map(c => `${toDateStr(c.date)}_${c.worker_id}`));
    const newlyConfirmed = responses
      .map(r => ({ ...r, date: toDateStr(r.date) }))
      .filter(r => !existingSet.has(`${r.date}_${r.worker_id}`));

    if (newlyConfirmed.length === 0) {
      return res.status(200).json({ success: true, message: '新しく確定できる回答はありませんでした（既に確定済みです）', confirmedCount: 0 });
    }

    await Promise.all(newlyConfirmed.map(r =>
      db.query(
        `INSERT INTO shift_confirmed (shift_request_id, worker_id, date) VALUES ($1, $2, $3)
         ON CONFLICT (shift_request_id, worker_id, date) DO NOTHING`,
        [shift.id, r.worker_id, r.date]
      )
    ));

    await Promise.all(newlyConfirmed.map(r => {
      const code = buildShiftAssignmentCode(shift.id, r.date, r.worker_id);
      return db.query(
        `INSERT INTO assignments (
           assignment_code, title, team_id, assigned_worker_id, status, priority,
           start_date, end_date, description, shift_type, shift_request_id, company_id
         )
         VALUES ($1, $2, $3, $4, 'pending', 'medium', $5, $5, $6, $7, $8, $9)
         ON CONFLICT (shift_request_id, assigned_worker_id, start_date) WHERE shift_request_id IS NOT NULL
         DO UPDATE SET
           shift_type = EXCLUDED.shift_type,
           description = EXCLUDED.description,
           status = 'pending',
           updated_at = NOW()`,
        [
          code, shift.title, r.team_id || null, r.worker_id, r.date,
          r.note || null, r.shift_type || null, shift.id, req.user.company_id,
        ]
      );
    }));

    // 作業員ごとに確定した日程をまとめて1通のメッセージで通知（日ごとに送ると大量になるため）
    const datesByWorker = new Map();
    newlyConfirmed.forEach(r => {
      if (!datesByWorker.has(r.worker_id)) datesByWorker.set(r.worker_id, []);
      datesByWorker.get(r.worker_id).push(r.date);
    });
    await Promise.all(Array.from(datesByWorker.entries()).map(([wid, dates]) => {
      dates.sort();
      const content = `シフト「${shift.title}」の以下の日程が確定しました: ${dates.join('、')}`;
      return db.query(
        `INSERT INTO messages (sender_id, receiver_id, content, shift_request_id) VALUES ($1, $2, $3, $4)`,
        [req.user.id, wid, content, shift.id]
      );
    }));
    sendToWorkers('new_message', { shiftRequestId: shift.id }, req.user.company_id);
    sendToWorkers('new_assignment', { title: shift.title }, req.user.company_id);

    res.status(200).json({
      success: true,
      message: `${newlyConfirmed.length}件のシフトを確定しました（対象作業員: ${datesByWorker.size}名）`,
      confirmedCount: newlyConfirmed.length,
    });
  } catch (error) {
    next(error);
  }
};

// 管理者: 再調査を送信（date を指定すればその日のみ再依頼）
exports.resendShiftRequest = async (req, res, next) => {
  try {
    const { date } = req.body || {};

    const { rows: shiftRows } = await db.query(
      `SELECT * FROM shift_requests WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (shiftRows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    const shift = shiftRows[0];

    const content = date
      ? `シフト調査「${shift.title}」の${date}について再度回答をお願いします。`
      : `シフト調査「${shift.title}」の再調査です。回答をお願いします。`;

    await broadcastShiftMessage(req.user.company_id, req.user.id, shift.id, content);
    await db.query(`UPDATE shift_requests SET status='open', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [shift.id]);

    res.status(200).json({ success: true, message: '再調査を送信しました' });
  } catch (error) {
    next(error);
  }
};

// 作業員: 自分宛のシフト調査一覧
exports.getMyShifts = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT sr.*,
         EXISTS(
           SELECT 1 FROM shift_responses r WHERE r.shift_request_id = sr.id AND r.worker_id = $2
         ) AS has_responded
       FROM shift_requests sr
       WHERE sr.company_id = $1
       ORDER BY sr.created_at DESC`,
      [req.user.company_id, req.user.id]
    );
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

// 管理者: 作業指示の期間中、シフトで○（出勤可）と回答している作業員を判定する。
// 作業指示のメンバー選択画面で「その日×を提出した人は表示しない」を実現するために使う。
// シフト調査自体が存在しない日付は判定対象から除外する（シフト機能を使っていない会社・期間の
// 作業指示作成が壊れないようにするため）
exports.getAvailableWorkers = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'startとendが必要です' });
    }
    if (new Date(start) > new Date(end)) {
      return res.status(400).json({ success: false, message: '期間の指定が正しくありません' });
    }

    const dates = dateRange(start, end);

    // この会社で、指定期間と重なるシフト調査（募集期間）を取得し、実際にシフト調査が
    // カバーしている日付だけを「判定対象日」とする
    const { rows: shiftRequests } = await db.query(
      `SELECT period_start, period_end FROM shift_requests
       WHERE company_id=$1 AND period_start <= $3 AND period_end >= $2`,
      [req.user.company_id, start, end]
    );
    const coveredDates = new Set();
    shiftRequests.forEach(sr => {
      const rangeStart = sr.period_start > start ? sr.period_start : start;
      const rangeEnd = sr.period_end < end ? sr.period_end : end;
      dateRange(rangeStart, rangeEnd).forEach(d => coveredDates.add(d));
    });

    // 期間中のシフト回答を取得し、日付ごとに「○と回答した作業員」「×と回答した作業員」を集計。
    // 期間の重なる複数の募集に同じ作業員・同じ日の回答が存在する場合は、
    // 安全側に倒して×が一件でもあれば対象外とする
    const { rows: responses } = await db.query(
      `SELECT r.worker_id, r.date, r.availability
       FROM shift_responses r
       JOIN shift_requests req ON r.shift_request_id = req.id
       WHERE req.company_id=$1 AND r.date BETWEEN $2 AND $3`,
      [req.user.company_id, start, end]
    );
    const availableByDate = {};
    const unavailableByDate = {};
    responses.forEach(r => {
      const d = toDateStr(r.date);
      if (r.availability === 'available') {
        if (!availableByDate[d]) availableByDate[d] = new Set();
        availableByDate[d].add(r.worker_id);
      } else if (r.availability === 'unavailable') {
        if (!unavailableByDate[d]) unavailableByDate[d] = new Set();
        unavailableByDate[d].add(r.worker_id);
      }
    });

    const { rows: workers } = await db.query(
      `SELECT id FROM users WHERE role='worker' AND is_active=true AND company_id=$1`,
      [req.user.company_id]
    );

    // 判定対象日(シフト調査がカバーしている日)ごとに、明示的な×がある作業員だけを不可(false)とする。
    // 未回答・△(応相談)はまだ「不可」と決まったわけではないので、不明(null)として区別する
    // （呼び出し側は false のときだけ候補から除外し、null は「未回答」として表示に残す）
    const availability = workers.map(w => {
      let hasUnavailable = false;
      let hasUnknown = false;
      dates.forEach(d => {
        if (!coveredDates.has(d)) return; // その日はシフト調査対象外 → 判定しない
        if (unavailableByDate[d]?.has(w.id)) { hasUnavailable = true; return; }
        if (!availableByDate[d]?.has(w.id)) hasUnknown = true; // 未回答 or △
      });
      const available = hasUnavailable ? false : (hasUnknown ? null : true);
      return { worker_id: w.id, available };
    });

    res.status(200).json({
      success: true,
      data: availability,
      hasShiftData: coveredDates.size > 0,
    });
  } catch (error) {
    next(error);
  }
};

// 管理者: シフト調査を削除する。
// 回答(shift_responses)・確定(shift_confirmed)は連動して削除されるが、
// 既に確定から作業指示(assignments)へ連携済みのデータは失われない
// （assignments.shift_request_id は ON DELETE SET NULL のため、作業指示自体は残る）
exports.deleteShiftRequest = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM shift_requests WHERE id=$1 AND company_id=$2 RETURNING id, title`,
      [req.params.id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'シフト調査が見つかりません' });
    }
    res.status(200).json({ success: true, message: `「${rows[0].title}」を削除しました` });
  } catch (error) {
    next(error);
  }
};
