const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getWorkers = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.employee_id, u.name, u.furigana, u.role, u.team_id, t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.role = 'worker' AND u.is_active = true
    `);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

exports.updateWorkerTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET team_id = $1 WHERE id = $2 AND role = 'worker' AND is_active = true
       RETURNING id, name, employee_id, team_id`,
      [teamId || null, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
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
    const { rows } = await db.query("SELECT id, employee_id, name, furigana, role, team_id FROM users WHERE id=$1 AND role='worker' AND is_active=true", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.createWorker = async (req, res, next) => {
  try {
    const { employee_id, name, furigana, password, team_id } = req.body;
    if (!employee_id || !employee_id.trim()) {
      return res.status(400).json({ success: false, message: '社員IDは必須です' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名は必須です' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'パスワードは6文字以上で入力してください' });
    }
    const existing = await db.query('SELECT id FROM users WHERE employee_id=$1', [employee_id.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'この社員IDはすでに使用されています' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (employee_id, name, furigana, role, team_id, password_hash)
       VALUES ($1, $2, $3, 'worker', $4, $5)
       RETURNING id, employee_id, name, furigana, role, team_id`,
      [employee_id.trim(), name.trim(), furigana?.trim() || null, team_id || null, password_hash]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, furigana, team_id, password } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名は必須です' });
    }
    let password_hash;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'パスワードは6文字以上で入力してください' });
      }
      password_hash = await bcrypt.hash(password, 10);
    }
    const updateQuery = password_hash
      ? `UPDATE users SET name=$1, furigana=$2, team_id=$3, password_hash=$4, updated_at=NOW()
         WHERE id=$5 AND role='worker' AND is_active=true RETURNING id, employee_id, name, furigana, role, team_id`
      : `UPDATE users SET name=$1, furigana=$2, team_id=$3, updated_at=NOW()
         WHERE id=$4 AND role='worker' AND is_active=true RETURNING id, employee_id, name, furigana, role, team_id`;
    const params = password_hash
      ? [name.trim(), furigana?.trim() || null, team_id || null, password_hash, id]
      : [name.trim(), furigana?.trim() || null, team_id || null, id];
    const { rows } = await db.query(updateQuery, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE users SET is_active=false, updated_at=NOW()
       WHERE id=$1 AND role='worker' AND is_active=true RETURNING id`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, message: '作業員を無効化しました' });
  } catch (err) {
    next(err);
  }
};
