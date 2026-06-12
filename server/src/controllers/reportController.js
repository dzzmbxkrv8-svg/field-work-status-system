const db = require('../config/db');

exports.getReports = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = 'SELECT r.*, u.name as worker_name FROM reports r JOIN users u ON r.worker_id=u.id WHERE u.company_id=$1 ORDER BY submitted_at DESC';
      params = [req.user.company_id];
    } else {
      query = `
        SELECT r.*, a.title as assignment_title, a.assignment_code 
        FROM reports r 
        LEFT JOIN assignments a ON r.assignment_id = a.id 
        WHERE r.worker_id = $1 
        ORDER BY r.submitted_at DESC
      `;
      params = [req.user.id];
    }
    const { rows } = await db.query(query, params);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.* FROM reports r
       JOIN users u ON r.worker_id = u.id
       WHERE r.id=$1 AND u.company_id=$2`,
      [req.params.id, req.user.company_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.submitReport = async (req, res, next) => {
  try {
    const { assignment_id, content, photo_url } = req.body;
    const { rows } = await db.query(`
      INSERT INTO reports (worker_id, assignment_id, date, content, photo_url)
      VALUES ($1, $2, CURRENT_DATE, $3, $4) RETURNING *
    `, [req.user.id, assignment_id || null, content, photo_url || null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
