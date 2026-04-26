const db = require('../config/db');

exports.getTeams = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.id, t.name, t.description, t.created_at,
             COUNT(u.id) AS worker_count
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND u.role = 'worker' AND u.is_active = true
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

exports.createTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'チーム名は必須です' });
    }
    const { rows } = await db.query(
      'INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at',
      [name.trim(), description?.trim() || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'チーム名は必須です' });
    }
    const { rows } = await db.query(
      'UPDATE teams SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description, created_at',
      [name.trim(), description?.trim() || null, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'チームが見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM teams WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'チームが見つかりません' });
    }
    res.status(200).json({ success: true, message: 'チームを削除しました' });
  } catch (err) {
    next(err);
  }
};

exports.getTeamWorkers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT id, employee_id, name FROM users
       WHERE team_id = $1 AND role = 'worker' AND is_active = true
       ORDER BY name ASC`,
      [id]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
