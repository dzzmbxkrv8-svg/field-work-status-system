const db = require('../config/db');

exports.getAssignments = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = 'SELECT * FROM assignments ORDER BY created_at DESC';
      params = [];
    } else {
      query = 'SELECT * FROM assignments WHERE team_id = (SELECT team_id FROM users WHERE id=$1) ORDER BY created_at DESC';
      params = [req.user.id];
    }
    const { rows } = await db.query(query, params);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.getAssignment = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM assignments WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const { assignment_code, title, location, team_id, priority, start_date, end_date, description } = req.body;
    const { rows } = await db.query(`
      INSERT INTO assignments (assignment_code, title, location, team_id, priority, start_date, end_date, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [assignment_code, title, location, team_id || null, priority || 'medium', start_date || null, end_date || null, description || null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query('UPDATE assignments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [status, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.assignWorker = async (req, res, next) => {
  try {
    const { worker_id } = req.body;
    // worker_id が null の場合は割り振り解除
    if (worker_id !== null && worker_id !== undefined) {
      const workerCheck = await db.query('SELECT id FROM users WHERE id=$1 AND role=$2', [worker_id, 'worker']);
      if (workerCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: '指定された作業員が見つかりません' });
      }
    }
    const { rows } = await db.query(
      'UPDATE assignments SET assigned_worker_id=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [worker_id || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '案件が見つかりません' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
