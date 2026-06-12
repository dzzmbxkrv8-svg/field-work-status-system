const db = require('../config/db');

exports.getTeams = async (req, res, next) => {
  try {
    // 管理者はアクセスコードも取得できる
    const isAdmin = req.user?.role === 'admin'
    const { rows } = await db.query(`
      SELECT t.id, t.name, t.description, t.created_at,
             ${isAdmin ? 't.access_code,' : ''}
             COUNT(u.id) AS worker_count
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND u.role = 'worker' AND u.is_active = true
      WHERE t.company_id = $1
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `, [req.user.company_id]);
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
      'INSERT INTO teams (name, description, company_id) VALUES ($1, $2, $3) RETURNING id, name, description, created_at',
      [name.trim(), description?.trim() || null, req.user.company_id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, access_code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'チーム名は必須です' });
    }
    // アクセスコードの重複チェック（会社内）
    if (access_code && access_code.trim()) {
      const dup = await db.query(
        'SELECT id FROM teams WHERE access_code = $1 AND id != $2 AND company_id = $3',
        [access_code.trim(), id, req.user.company_id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'このアクセスコードは既に使用されています' });
      }
    }
    const { rows } = await db.query(
      `UPDATE teams
       SET name = $1, description = $2, access_code = COALESCE(NULLIF($3, ''), access_code)
       WHERE id = $4 AND company_id = $5
       RETURNING id, name, description, access_code, created_at`,
      [name.trim(), description?.trim() || null, access_code?.trim() || '', id, req.user.company_id]
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
    const { rowCount } = await db.query(
      'DELETE FROM teams WHERE id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );
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
       WHERE team_id = $1 AND role = 'worker' AND is_active = true AND company_id = $2
       ORDER BY name ASC`,
      [id, req.user.company_id]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
