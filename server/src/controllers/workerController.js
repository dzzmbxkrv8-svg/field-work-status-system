const db = require('../config/db');

exports.getWorkers = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.employee_id, u.name, u.role, u.team_id, t.name as team_name 
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.role = 'worker' AND u.is_active = true
    `);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

exports.getWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && parseInt(id, 10) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'アクセス権がありません' });
    }
    const { rows } = await db.query("SELECT id, employee_id, name, role, team_id FROM users WHERE id=$1 AND role='worker' AND is_active=true", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};
