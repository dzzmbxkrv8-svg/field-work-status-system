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
    if (status === 'woke_up') timeField = 'woke_up_at';
    else if (status === 'departed') timeField = 'departed_at';
    else if (status === 'arrived') timeField = 'arrived_at';
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
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.getTeamToday = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      query = `
        SELECT u.id as worker_id, u.name, u.employee_id, u.team_id, a.status, a.woke_up_at, a.departed_at, a.arrived_at, a.finished_at, a.updated_at
        FROM users u
        LEFT JOIN attendance a ON u.id = a.worker_id AND a.date = CURRENT_DATE
        WHERE u.role = 'worker'
      `;
      params = [];
    } else {
      query = `
        SELECT u.id as worker_id, u.name, u.employee_id, u.team_id, a.status, a.woke_up_at, a.departed_at, a.arrived_at, a.finished_at, a.updated_at
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
    const { rows } = await db.query('SELECT * FROM attendance WHERE date >= $1 AND date <= $2', [start_date, end_date]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};
