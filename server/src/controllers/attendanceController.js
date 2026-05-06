const db = require('../config/db');

exports.getToday = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM attendance WHERE worker_id=$1 AND date=CURRENT_DATE', [req.user.id]);
    if (rows.length === 0) {
      return res.status(200).json({ success: true, data: { status: 'not_reported' } });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, lat, lng } = req.body;
    let timeField = '';
    if (status === 'woke_up')   timeField = 'woke_up_at';
    else if (status === 'departed') timeField = 'departed_at';
    else if (status === 'arrived')  timeField = 'arrived_at';
    else if (status === 'finished') timeField = 'finished_at';

    let query, params;
    if (timeField) {
      query = `
        INSERT INTO attendance (worker_id, date, status, ${timeField}, location_lat, location_lng)
        VALUES ($1, CURRENT_DATE, $2, NOW(), $3, $4)
        ON CONFLICT (worker_id, date)
        DO UPDATE SET status=$2, ${timeField}=NOW(), updated_at=NOW(), location_lat=$3, location_lng=$4
        RETURNING *;
      `;
    } else {
      query = `
        INSERT INTO attendance (worker_id, date, status, location_lat, location_lng)
        VALUES ($1, CURRENT_DATE, $2, $3, $4)
        ON CONFLICT (worker_id, date)
        DO UPDATE SET status=$2, updated_at=NOW(), location_lat=$3, location_lng=$4
        RETURNING *;
      `;
    }
    params = [req.user.id, status, lat || null, lng || null];
    const { rows } = await db.query(query, params);

    // 到着 → 担当案件を「進行中」に自動更新
    if (status === 'arrived') {
      await db.query(`
        UPDATE assignments
        SET status = 'in_progress', updated_at = NOW()
        WHERE assigned_worker_id = $1
          AND status = 'pending'
          AND start_date <= CURRENT_DATE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `, [req.user.id]);
    }

    // 終了 → 担当案件を「完了」に自動更新
    if (status === 'finished') {
      await db.query(`
        UPDATE assignments
        SET status = 'completed', updated_at = NOW()
        WHERE assigned_worker_id = $1
          AND status = 'in_progress'
      `, [req.user.id]);
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.getTeamToday = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT u.id as worker_id, u.name, u.employee_id, u.team_id, a.status,
               a.woke_up_at, a.departed_at, a.arrived_at, a.finished_at, a.updated_at
        FROM users u
        LEFT JOIN attendance a ON u.id = a.worker_id AND a.date = CURRENT_DATE
        WHERE u.role = 'worker'
      `;
      params = [];
    } else {
      query = `
        SELECT u.id as worker_id, u.name, u.employee_id, u.team_id, a.status,
               a.woke_up_at, a.departed_at, a.arrived_at, a.finished_at, a.updated_at
        FROM users u
        LEFT JOIN attendance a ON u.id = a.worker_id AND a.date = CURRENT_DATE
        WHERE u.role = 'worker' AND u.team_id = $1
      `;
      params = [req.user.team_id];
    }
    const { rows } = await db.query(query, params);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'start_dateとend_dateは必須です (YYYY-MM-DD)' });
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(start_date) || !datePattern.test(end_date)) {
      return res.status(400).json({ success: false, message: '日付はYYYY-MM-DD形式で指定してください' });
    }
    if (start_date > end_date) {
      return res.status(400).json({ success: false, message: 'start_dateはend_date以前の日付にしてください' });
    }
    const { rows } = await db.query(
      `SELECT a.*, u.name as worker_name, u.employee_id
       FROM attendance a
       JOIN users u ON a.worker_id = u.id
       WHERE a.date >= $1 AND a.date <= $2
       ORDER BY a.date DESC, u.name ASC`,
      [start_date, end_date]
    );
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};
